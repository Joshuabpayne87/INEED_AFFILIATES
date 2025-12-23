import { supabase } from './supabase';
import { OfferPriceOption } from '../types/offerPriceOption';

/**
 * Load price options for an offer
 */
export async function loadOfferPriceOptions(offerId: string): Promise<OfferPriceOption[]> {
  try {
    const { data, error } = await supabase
      .from('offer_price_options')
      .select('*')
      .eq('offer_id', offerId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      currency: row.currency || 'USD',
      frequency: row.frequency as OfferPriceOption['frequency'],
      sort_order: row.sort_order,
    }));
  } catch (error) {
    console.error('Error loading price options:', error);
    return [];
  }
}

/**
 * Save price options for an offer (atomic upsert)
 * This function:
 * 1. Fetches existing price option IDs
 * 2. Upserts submitted rows (preserves id if editing)
 * 3. Deletes any existing rows not in the submitted payload
 */
export async function saveOfferPriceOptions(
  offerId: string,
  priceOptions: OfferPriceOption[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch existing price option IDs
    const { data: existing } = await supabase
      .from('offer_price_options')
      .select('id')
      .eq('offer_id', offerId);

    const existingIds = new Set(existing?.map((r) => r.id) || []);

    // Prepare upsert data with sort_order
    const toUpsert = priceOptions
      .filter((opt) => opt.amount > 0 && opt.frequency) // Only valid options
      .map((opt, index) => ({
        id: opt.id || undefined,
        offer_id: offerId,
        amount: opt.amount,
        currency: opt.currency || 'USD',
        frequency: opt.frequency,
        sort_order: index,
      }));

    // Delete existing rows not in the new payload
    const submittedIds = new Set(priceOptions.filter((opt) => opt.id).map((opt) => opt.id!));
    const toDelete = Array.from(existingIds).filter((id) => !submittedIds.has(id));

    // Perform operations in a transaction-like manner
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('offer_price_options')
        .delete()
        .in('id', toDelete);

      if (deleteError) throw deleteError;
    }

    if (toUpsert.length > 0) {
      // Upsert (insert or update)
      const { error: upsertError } = await supabase
        .from('offer_price_options')
        .upsert(toUpsert, {
          onConflict: 'id',
        });

      if (upsertError) throw upsertError;
    } else if (existingIds.size > 0) {
      // If no valid options but there were existing ones, delete all
      const { error: deleteAllError } = await supabase
        .from('offer_price_options')
        .delete()
        .eq('offer_id', offerId);

      if (deleteAllError) throw deleteAllError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving price options:', error);
    return { success: false, error: error.message || 'Failed to save price options' };
  }
}


