import { supabase } from './supabase';

export async function updateVaultEntriesOnApproval(userId: string, businessId: string) {
  try {
    const { error } = await supabase
      .from('offer_vault')
      .update({ status: 'approved' })
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('status', 'pending_connection');

    if (error) throw error;
  } catch (error) {
    console.error('Error updating vault entries on approval:', error);
  }
}
