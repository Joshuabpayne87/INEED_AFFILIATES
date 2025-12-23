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

    // Separate new records (no id) from existing records (with id)
    // Calculate sort_order based on position in the valid options array
    const validOptions = priceOptions.filter((opt) => opt.amount > 0 && opt.frequency);
    const toInsert = validOptions
      .map((opt, index) => ({ opt, index }))
      .filter(({ opt }) => !opt.id) // New records without id
      .map(({ opt, index }) => ({
        offer_id: offerId,
        amount: opt.amount,
        currency: opt.currency || 'USD',
        frequency: opt.frequency,
        sort_order: index,
      }));
    
    const toUpdate = validOptions
      .map((opt, index) => ({ opt, index }))
      .filter(({ opt }) => opt.id) // Existing records with id
      .map(({ opt, index }) => ({
        id: opt.id!,
        offer_id: offerId,
        amount: opt.amount,
        currency: opt.currency || 'USD',
        frequency: opt.frequency,
        sort_order: index,
      }));

    // Delete existing rows not in the new payload
    const submittedIds = new Set(validOptions.filter((opt) => opt.id).map((opt) => opt.id!));
    const toDelete = Array.from(existingIds).filter((id) => !submittedIds.has(id));

    // Perform operations in a transaction-like manner
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('offer_price_options')
        .delete()
        .in('id', toDelete);

      if (deleteError) throw deleteError;
    }

    // Update existing records
    if (toUpdate.length > 0) {
      for (const record of toUpdate) {
        const { id, ...updateData } = record;
        const { error: updateError } = await supabase
          .from('offer_price_options')
          .update(updateData)
          .eq('id', id);

        if (updateError) throw updateError;
      }
    }

    // Insert new records
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('offer_price_options')
        .insert(toInsert);

      if (insertError) throw insertError;
    } else if (existingIds.size > 0 && validOptions.length === 0) {
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


