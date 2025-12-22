import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  Filter,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { displayPrice } from '../lib/currencyUtils';

interface AffiliateSummary {
  affiliate_user_id: string;
  affiliate_name: string;
  affiliate_email: string;
  w9_status: 'none' | 'submitted' | 'approved' | 'rejected';
  clicks: number;
  conversions: number;
  sales: number;
  affiliate_owed: number;
  ina_owed: number;
  unpaid_commissions: CommissionEvent[];
}

interface CommissionEvent {
  id: string;
  lead_id: string;
  affiliate_user_id: string;
  affiliate_name: string;
  affiliate_email: string;
  affiliate_commission_amount: number;
  ina_commission_amount: number;
  currency: string;
  status: 'pending' | 'payable' | 'paid';
  payable_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  created_at: string;
  days_late: number;
}

interface PaymentForm {
  payment_method: string;
  paid_date: string;
  notes: string;
}

interface AddLeadForm {
  name: string;
  email: string;
  phone: string;
  affiliate_user_id: string;
  offer_id: string;
  booked_call: boolean;
  sale: boolean;
  sale_amount: number;
  commission_to_affiliate: number;
  commission_to_ina: number;
  paid: boolean;
}

export function BusinessLeads() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [affiliateSummaries, setAffiliateSummaries] = useState<AffiliateSummary[]>([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateSummary | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    payment_method: '',
    paid_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [addLeadForm, setAddLeadForm] = useState<AddLeadForm>({
    name: '',
    email: '',
    phone: '',
    affiliate_user_id: '',
    offer_id: '',
    booked_call: false,
    sale: false,
    sale_amount: 0,
    commission_to_affiliate: 0,
    commission_to_ina: 0,
    paid: false,
  });
  const [saving, setSaving] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<Array<{ id: string; offer_name: string }>>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadLeadsData();
    }
  }, [user]);

  const loadLeadsData = async () => {
    if (!user) return;

    try {
      // Get user's business
      const { data: business } = await supabase
        .from('businesses')
        .select('id, affiliate_commission_type, affiliate_commission_value, ina_commission_type, ina_commission_value, commission_currency')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (!business) {
        setLoading(false);
        return;
      }

      setBusinessId(business.id);

      // Load available offers for this business
      const { data: offers } = await supabase
        .from('offers')
        .select('id, offer_name')
        .eq('business_id', business.id)
        .eq('is_active', true);

      setAvailableOffers(offers || []);

      // Get all commission events for this business
      const { data: commissions, error: commError } = await supabase
        .from('commission_events')
        .select(`
          id,
          affiliate_user_id,
          affiliate_commission_amount,
          ina_commission_amount,
          currency,
          status,
          payable_at,
          paid_at,
          payment_method,
          payment_notes,
          created_at,
          leads!inner(
            id,
            event_type,
            amount,
            created_at
          ),
          users!commission_events_affiliate_user_id_fkey(
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (commError) throw commError;

      // Get all affiliates who have links for this business's offers (not just those with commissions)
      const { data: allAffiliateLinks } = await supabase
        .from('affiliate_links')
        .select('affiliate_user_id')
        .eq('business_id', business.id);

      const allAffiliateIds = new Set([
        ...(commissions?.map(c => c.affiliate_user_id) || []),
        ...(allAffiliateLinks?.map(l => l.affiliate_user_id) || [])
      ]);

      // Get W-9 status for all affiliates
      const { data: taxDocs } = await supabase
        .from('affiliate_tax_docs')
        .select('affiliate_user_id, status')
        .eq('doc_type', 'w9')
        .in('affiliate_user_id', Array.from(allAffiliateIds));

      const taxDocMap = new Map(
        taxDocs?.map(doc => [doc.affiliate_user_id, doc.status as 'submitted' | 'approved' | 'rejected']) || []
      );

      // Get user details for all affiliates
      const { data: affiliateUsers } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', Array.from(allAffiliateIds));

      const userMap = new Map(
        affiliateUsers?.map(u => [
          u.id,
          {
            email: u.email || '',
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown'
          }
        ]) || []
      );

      // Get clicks count per affiliate
      const { data: clicks } = await supabase
        .from('clicks')
        .select('affiliate_user_id')
        .eq('business_id', business.id);

      // Group by affiliate - initialize all affiliates who have links
      const affiliateMap = new Map<string, AffiliateSummary>();

      // Initialize all affiliates who have links
      allAffiliateIds.forEach((affId) => {
        const userInfo = userMap.get(affId);
        affiliateMap.set(affId, {
          affiliate_user_id: affId,
          affiliate_name: userInfo?.name || 'Unknown',
          affiliate_email: userInfo?.email || '',
          w9_status: taxDocMap.get(affId) || 'none',
          clicks: 0,
          conversions: 0,
          sales: 0,
          affiliate_owed: 0,
          ina_owed: 0,
          unpaid_commissions: [],
        });
      });

      commissions?.forEach((comm: any) => {
        const affId = comm.affiliate_user_id;
        const userData = comm.users;
        const lead = comm.leads;

        // Update existing or create if somehow missing
        if (!affiliateMap.has(affId)) {
          affiliateMap.set(affId, {
            affiliate_user_id: affId,
            affiliate_name: userData?.first_name && userData?.last_name
              ? `${userData.first_name} ${userData.last_name}`
              : userData?.email || 'Unknown',
            affiliate_email: userData?.email || '',
            w9_status: taxDocMap.get(affId) || 'none',
            clicks: 0,
            conversions: 0,
            sales: 0,
            affiliate_owed: 0,
            ina_owed: 0,
            unpaid_commissions: [],
          });
        }

        const summary = affiliateMap.get(affId)!;
        
        // Count conversions
        if (lead?.event_type === 'purchase') {
          summary.conversions++;
          summary.sales += Number(lead.amount || 0);
        } else if (lead?.event_type) {
          summary.conversions++;
        }

        // Sum commissions
        if (comm.status !== 'paid') {
          summary.affiliate_owed += Number(comm.affiliate_commission_amount);
          summary.ina_owed += Number(comm.ina_commission_amount);

          // Calculate days late
          const payableAt = new Date(comm.payable_at);
          const now = new Date();
          const daysLate = Math.floor((now.getTime() - payableAt.getTime()) / (24 * 60 * 60 * 1000));

          summary.unpaid_commissions.push({
            id: comm.id,
            lead_id: lead?.id || '',
            affiliate_user_id: affId,
            affiliate_name: summary.affiliate_name,
            affiliate_email: summary.affiliate_email,
            affiliate_commission_amount: Number(comm.affiliate_commission_amount),
            ina_commission_amount: Number(comm.ina_commission_amount),
            currency: comm.currency || 'USD',
            status: comm.status,
            payable_at: comm.payable_at,
            paid_at: comm.paid_at,
            payment_method: comm.payment_method,
            payment_notes: comm.payment_notes,
            created_at: comm.created_at,
            days_late: daysLate > 0 ? daysLate : 0,
          });
        }
      });

      // Add clicks counts
      clicks?.forEach((click: any) => {
        const summary = affiliateMap.get(click.affiliate_user_id);
        if (summary) {
          summary.clicks++;
        }
      });

      setAffiliateSummaries(Array.from(affiliateMap.values()));
    } catch (error) {
      console.error('Error loading leads data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = (commissionIds: string[]) => {
    setSelectedCommissions(commissionIds);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedCommissions.length || !paymentForm.payment_method || !paymentForm.paid_date) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('commission_events')
        .update({
          status: 'paid',
          paid_at: new Date(paymentForm.paid_date).toISOString(),
          payment_method: paymentForm.payment_method,
          payment_notes: paymentForm.notes || null,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedCommissions);

      if (error) throw error;

      // Reload data
      await loadLeadsData();
      setShowPaymentModal(false);
      setPaymentForm({
        payment_method: '',
        paid_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setSelectedCommissions([]);
    } catch (error: any) {
      console.error('Error saving payment:', error);
      alert(error.message || 'Failed to save payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getW9StatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">W-9 ✓</span>;
      case 'submitted':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">W-9 Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">W-9 Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">No W-9</span>;
    }
  };

  const handleOpenAddLead = async () => {
    if (!businessId) {
      alert('Business not found. Please ensure your business profile is set up.');
      return;
    }

    // Get business commission settings
    const { data: business } = await supabase
      .from('businesses')
      .select('affiliate_commission_type, affiliate_commission_value, ina_commission_type, ina_commission_value')
      .eq('id', businessId)
      .single();

    if (business) {
      // Store business commission settings for calculation
      setAddLeadForm(prev => ({
        ...prev,
        // Reset form but keep business context
      }));
    }

    setShowAddLeadModal(true);
  };

  const calculateCommissions = async (saleAmount: number) => {
    if (!businessId || saleAmount <= 0) return;

    try {
      // Get business commission settings
      const { data: business } = await supabase
        .from('businesses')
        .select('affiliate_commission_type, affiliate_commission_value, ina_commission_type, ina_commission_value')
        .eq('id', businessId)
        .single();

      if (!business) return;

      let affiliateCommission = 0;
      let inaCommission = 0;

      // Calculate affiliate commission
      if (business.affiliate_commission_type === 'percent') {
        affiliateCommission = (saleAmount * Number(business.affiliate_commission_value)) / 100;
      } else {
        affiliateCommission = Number(business.affiliate_commission_value);
      }

      // Calculate INA commission
      if (business.ina_commission_type === 'percent') {
        inaCommission = (saleAmount * Number(business.ina_commission_value)) / 100;
      } else {
        inaCommission = Number(business.ina_commission_value);
      }

      setAddLeadForm(prev => ({
        ...prev,
        commission_to_affiliate: affiliateCommission,
        commission_to_ina: inaCommission,
      }));
    } catch (error) {
      console.error('Error calculating commissions:', error);
    }
  };

  const handleSaveLead = async () => {
    if (!addLeadForm.name || !addLeadForm.email || !addLeadForm.affiliate_user_id || !addLeadForm.offer_id) {
      alert('Please fill in all required fields: Name, Email, Affiliate, and Offer');
      return;
    }

    if (addLeadForm.sale && addLeadForm.sale_amount <= 0) {
      alert('Sale amount must be greater than 0 if Sale is checked');
      return;
    }

    if (!businessId) {
      alert('Business not found');
      return;
    }

    setSavingLead(true);
    try {
      // Determine event type
      let eventType: 'lead' | 'booked_call' | 'purchase' = 'lead';
      if (addLeadForm.sale) {
        eventType = 'purchase';
      } else if (addLeadForm.booked_call) {
        eventType = 'booked_call';
      }

      // Parse name into first and last name
      const nameParts = addLeadForm.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Get business commission settings
      const { data: business } = await supabase
        .from('businesses')
        .select('affiliate_commission_type, affiliate_commission_value, ina_commission_type, ina_commission_value, commission_currency')
        .eq('id', businessId)
        .single();

      if (!business) throw new Error('Business not found');

      // Calculate commissions if not manually set
      let affiliateCommission = addLeadForm.commission_to_affiliate;
      let inaCommission = addLeadForm.commission_to_ina;

      if (addLeadForm.sale && addLeadForm.sale_amount > 0) {
        if (business.affiliate_commission_type === 'percent') {
          affiliateCommission = (addLeadForm.sale_amount * Number(business.affiliate_commission_value)) / 100;
        } else {
          affiliateCommission = Number(business.affiliate_commission_value);
        }

        if (business.ina_commission_type === 'percent') {
          inaCommission = (addLeadForm.sale_amount * Number(business.ina_commission_value)) / 100;
        } else {
          inaCommission = Number(business.ina_commission_value);
        }
      }

      // Create lead record
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          offer_id: addLeadForm.offer_id,
          business_id: businessId,
          affiliate_user_id: addLeadForm.affiliate_user_id,
          event_type: eventType,
          email: addLeadForm.email,
          first_name: firstName,
          last_name: lastName,
          phone: addLeadForm.phone || null,
          customer_email: addLeadForm.email,
          customer_name: addLeadForm.name,
          customer_phone: addLeadForm.phone || null,
          amount: addLeadForm.sale ? addLeadForm.sale_amount : 0,
          conversion_value: addLeadForm.sale ? addLeadForm.sale_amount : 0,
          currency: business.commission_currency || 'USD',
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Determine commission status
      const MINIMUM_PAYOUT_THRESHOLD = 50;
      let status: 'pending' | 'payable' = 'pending';
      
      if (addLeadForm.paid) {
        status = 'paid';
      } else {
        // Check if total pending + this commission meets threshold
        const { data: pendingCommissions } = await supabase
          .from('commission_events')
          .select('affiliate_commission_amount')
          .eq('affiliate_user_id', addLeadForm.affiliate_user_id)
          .in('status', ['pending', 'payable']);

        const currentTotal = pendingCommissions?.reduce((sum, c) => sum + Number(c.affiliate_commission_amount), 0) || 0;
        const newTotal = currentTotal + affiliateCommission;

        if (newTotal >= MINIMUM_PAYOUT_THRESHOLD) {
          status = 'payable';
        }
      }

      // Create commission event
      const { error: commissionError } = await supabase
        .from('commission_events')
        .insert({
          business_id: businessId,
          offer_id: addLeadForm.offer_id,
          affiliate_user_id: addLeadForm.affiliate_user_id,
          lead_id: lead.id,
          affiliate_commission_amount: affiliateCommission,
          ina_commission_amount: inaCommission,
          currency: business.commission_currency || 'USD',
          status: addLeadForm.paid ? 'paid' : status,
          payable_at: addLeadForm.paid ? null : (status === 'payable' ? new Date().toISOString() : null),
          paid_at: addLeadForm.paid ? new Date().toISOString() : null,
          payment_method: addLeadForm.paid ? 'manual_entry' : null,
        });

      if (commissionError) throw commissionError;

      // Reload data
      await loadLeadsData();
      setShowAddLeadModal(false);
      setAddLeadForm({
        name: '',
        email: '',
        phone: '',
        affiliate_user_id: '',
        offer_id: '',
        booked_call: false,
        sale: false,
        sale_amount: 0,
        commission_to_affiliate: 0,
        commission_to_ina: 0,
        paid: false,
      });
      alert('Lead created successfully!');
    } catch (error: any) {
      console.error('Error saving lead:', error);
      alert(error.message || 'Failed to save lead. Please try again.');
    } finally {
      setSavingLead(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Leads & Payments</h1>
        </div>
        <Card className="h-96 animate-pulse bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">Leads & Payments</h1>
          <p className="text-gray-600">Manage affiliate relationships and commission payments</p>
        </div>
        <Button
          onClick={handleOpenAddLead}
          variant="gradient"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </div>

      {/* Affiliate Summaries */}
      <div className="grid grid-cols-1 gap-4">
        {affiliateSummaries.map((affiliate) => (
          <Card key={affiliate.affiliate_user_id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{affiliate.affiliate_name}</h3>
                  {getW9StatusBadge(affiliate.w9_status)}
                </div>
                <p className="text-sm text-gray-600">{affiliate.affiliate_email}</p>
              </div>
              {affiliate.unpaid_commissions.length > 0 && (
                <Button
                  onClick={() => handleMarkAsPaid(affiliate.unpaid_commissions.map(c => c.id))}
                  variant="gradient"
                  size="sm"
                >
                  Mark All as Paid
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Clicks</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{affiliate.clicks}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">Conversions</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{affiliate.conversions}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Sales</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{displayPrice(affiliate.sales.toString())}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Affiliate Owed</span>
                </div>
                <p className="text-xl font-bold text-blue-900">
                  ${affiliate.affiliate_owed.toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">INA Owed</span>
                </div>
                <p className="text-xl font-bold text-purple-900">
                  ${affiliate.ina_owed.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Unpaid Commissions Table */}
            {affiliate.unpaid_commissions.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Unpaid Commissions</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Affiliate</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">INA</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Days Late</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {affiliate.unpaid_commissions.map((comm) => (
                        <tr key={comm.id} className={comm.days_late > 45 ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 text-gray-900">
                            {new Date(comm.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">
                            {comm.status === 'payable' ? (
                              <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                                Payable
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-900">
                            ${comm.affiliate_commission_amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-purple-900">
                            ${comm.ina_commission_amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            {comm.days_late > 0 ? (
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                comm.days_late > 70 
                                  ? 'bg-red-100 text-red-800'
                                  : comm.days_late > 45
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {comm.days_late} days
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              onClick={() => handleMarkAsPaid([comm.id])}
                              variant="outline"
                              size="sm"
                            >
                              Mark Paid
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {affiliateSummaries.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Affiliates Yet</h3>
          <p className="text-gray-600">
            When affiliates promote your offers and generate conversions, they'll appear here.
          </p>
        </Card>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentForm({
            payment_method: '',
            paid_date: new Date().toISOString().split('T')[0],
            notes: '',
          });
        }}
        title="Mark as Paid"
      >
        <div className="space-y-4">
          <Select
            label="Payment Method *"
            value={paymentForm.payment_method}
            onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
            options={[
              { value: '', label: 'Select method...' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'check', label: 'Check' },
              { value: 'paypal', label: 'PayPal' },
              { value: 'stripe', label: 'Stripe' },
              { value: 'other', label: 'Other' },
            ]}
          />

          <Input
            label="Paid Date *"
            type="date"
            value={paymentForm.paid_date}
            onChange={(e) => setPaymentForm({ ...paymentForm, paid_date: e.target.value })}
          />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
              rows={3}
              placeholder="Payment reference, transaction ID, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSavePayment}
              disabled={saving}
              loading={saving}
            >
              Mark as Paid
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Lead Modal */}
      <Modal
        isOpen={showAddLeadModal}
        onClose={() => {
          setShowAddLeadModal(false);
          setAddLeadForm({
            name: '',
            email: '',
            phone: '',
            affiliate_user_id: '',
            offer_id: '',
            booked_call: false,
            sale: false,
            sale_amount: 0,
            commission_to_affiliate: 0,
            commission_to_ina: 0,
            paid: false,
          });
        }}
        title="Add Lead"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={addLeadForm.name}
              onChange={(e) => setAddLeadForm({ ...addLeadForm, name: e.target.value })}
              placeholder="John Doe"
            />

            <Input
              label="Email *"
              type="email"
              value={addLeadForm.email}
              onChange={(e) => setAddLeadForm({ ...addLeadForm, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <Input
            label="Phone Number"
            type="tel"
            value={addLeadForm.phone}
            onChange={(e) => setAddLeadForm({ ...addLeadForm, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Affiliate *
              </label>
              <select
                value={addLeadForm.affiliate_user_id}
                onChange={(e) => {
                  setAddLeadForm({ ...addLeadForm, affiliate_user_id: e.target.value });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                required
              >
                <option value="">Select affiliate...</option>
                {affiliateSummaries.length === 0 ? (
                  <option value="" disabled>No affiliates found. Add offers to your vault first.</option>
                ) : (
                  affiliateSummaries.map((affiliate) => (
                    <option key={affiliate.affiliate_user_id} value={affiliate.affiliate_user_id}>
                      {affiliate.affiliate_name} ({affiliate.affiliate_email})
                    </option>
                  ))
                )}
              </select>
              {affiliateSummaries.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Note: Affiliates will appear here after they add your offers to their vault.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Offer *
              </label>
              <select
                value={addLeadForm.offer_id}
                onChange={(e) => {
                  setAddLeadForm({ ...addLeadForm, offer_id: e.target.value });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                required
              >
                <option value="">Select offer...</option>
                {availableOffers.length === 0 ? (
                  <option value="" disabled>No active offers found. Create an offer first.</option>
                ) : (
                  availableOffers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.offer_name}
                    </option>
                  ))
                )}
              </select>
              {availableOffers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Create an offer in Settings to add leads.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addLeadForm.booked_call}
                onChange={(e) => setAddLeadForm({ ...addLeadForm, booked_call: e.target.checked, sale: e.target.checked ? false : addLeadForm.sale })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-semibold text-gray-700">Booked Call</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addLeadForm.sale}
                onChange={(e) => {
                  const isSale = e.target.checked;
                  setAddLeadForm({ 
                    ...addLeadForm, 
                    sale: isSale,
                    booked_call: isSale ? false : addLeadForm.booked_call,
                    sale_amount: isSale ? addLeadForm.sale_amount : 0,
                  });
                  if (isSale && addLeadForm.sale_amount > 0) {
                    calculateCommissions(addLeadForm.sale_amount);
                  } else if (!isSale) {
                    setAddLeadForm(prev => ({ ...prev, commission_to_affiliate: 0, commission_to_ina: 0 }));
                  }
                }}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-semibold text-gray-700">Sale</span>
            </label>
          </div>

          {addLeadForm.sale && (
            <>
              <Input
                label="Sale Amount *"
                type="number"
                min="0"
                step="0.01"
                value={addLeadForm.sale_amount || ''}
                onChange={async (e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  setAddLeadForm({ ...addLeadForm, sale_amount: amount });
                  if (amount > 0 && addLeadForm.affiliate_user_id && addLeadForm.offer_id) {
                    await calculateCommissions(amount);
                  }
                }}
                placeholder="0.00"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission to Affiliate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addLeadForm.commission_to_affiliate || ''}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, commission_to_affiliate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission to INA
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addLeadForm.commission_to_ina || ''}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, commission_to_ina: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={addLeadForm.paid}
              onChange={(e) => setAddLeadForm({ ...addLeadForm, paid: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="text-sm font-semibold text-gray-700">Paid</span>
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddLeadModal(false)}
              disabled={savingLead}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSaveLead}
              disabled={savingLead}
              loading={savingLead}
            >
              Save Lead
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

