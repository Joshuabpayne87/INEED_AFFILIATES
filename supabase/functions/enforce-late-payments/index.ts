import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LATE_FLAG_DAYS = 45;
const SUSPEND_DAYS = 70;

serve(async (req) => {
  try {
    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const lateFlagDate = new Date(now.getTime() - LATE_FLAG_DAYS * 24 * 60 * 60 * 1000);
    const suspendDate = new Date(now.getTime() - SUSPEND_DAYS * 24 * 60 * 60 * 1000);

    // Find businesses with unpaid commissions
    const { data: unpaidCommissions, error: commissionsError } = await supabase
      .from('commission_events')
      .select('business_id, payable_at, affiliate_commission_amount, ina_commission_amount, status')
      .in('status', ['payable', 'pending'])
      .not('payable_at', 'is', null);

    if (commissionsError) {
      console.error('Error fetching unpaid commissions:', commissionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch commissions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Group by business_id and calculate totals
    const businessStats = new Map<string, {
      maxDaysLate: number;
      unpaidAffiliateTotal: number;
      unpaidInaTotal: number;
      shouldFlagLate: boolean;
      shouldSuspend: boolean;
    }>();

    unpaidCommissions?.forEach((commission) => {
      const payableAt = new Date(commission.payable_at!);
      const daysLate = Math.floor((now.getTime() - payableAt.getTime()) / (24 * 60 * 60 * 1000));

      if (!businessStats.has(commission.business_id)) {
        businessStats.set(commission.business_id, {
          maxDaysLate: 0,
          unpaidAffiliateTotal: 0,
          unpaidInaTotal: 0,
          shouldFlagLate: false,
          shouldSuspend: false,
        });
      }

      const stats = businessStats.get(commission.business_id)!;
      stats.maxDaysLate = Math.max(stats.maxDaysLate, daysLate);
      stats.unpaidAffiliateTotal += Number(commission.affiliate_commission_amount);
      stats.unpaidInaTotal += Number(commission.ina_commission_amount);
      stats.shouldFlagLate = stats.shouldFlagLate || daysLate >= LATE_FLAG_DAYS;
      stats.shouldSuspend = stats.shouldSuspend || daysLate >= SUSPEND_DAYS;
    });

    // Update businesses with cached totals and flags
    const updatePromises: Promise<any>[] = [];

    for (const [businessId, stats] of businessStats.entries()) {
      const updateData: any = {
        max_days_late: stats.maxDaysLate,
        unpaid_affiliate_total: stats.unpaidAffiliateTotal,
        unpaid_ina_total: stats.unpaidInaTotal,
        late_payout_flag: stats.shouldFlagLate,
      };

      // Suspend if necessary
      if (stats.shouldSuspend) {
        updateData.is_suspended = true;
        updateData.is_live = false;
        if (!updateData.suspended_at) {
          updateData.suspended_at = now.toISOString();
        }
      }

      updatePromises.push(
        supabase
          .from('businesses')
          .update(updateData)
          .eq('id', businessId)
      );
    }

    await Promise.all(updatePromises);

    // Reset businesses that no longer have unpaid commissions
    const { data: allBusinessIds } = await supabase
      .from('businesses')
      .select('id')
      .or('late_payout_flag.eq.true,is_suspended.eq.true,unpaid_affiliate_total.gt.0,unpaid_ina_total.gt.0');

    const businessesWithUnpaid = new Set(businessStats.keys());
    
    if (allBusinessIds) {
      for (const business of allBusinessIds) {
        if (!businessesWithUnpaid.has(business.id)) {
          // Reset flags if no unpaid commissions
          await supabase
            .from('businesses')
            .update({
              late_payout_flag: false,
              max_days_late: 0,
              unpaid_affiliate_total: 0,
              unpaid_ina_total: 0,
              // Don't auto-unsuspend - admin must do that manually
            })
            .eq('id', business.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: businessStats.size,
        flagged: Array.from(businessStats.values()).filter(s => s.shouldFlagLate).length,
        suspended: Array.from(businessStats.values()).filter(s => s.shouldSuspend).length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in enforce-late-payments:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

