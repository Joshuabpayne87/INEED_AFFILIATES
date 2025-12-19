import { supabase } from './supabase';
import { CRMCard, CRMCardWithConnection, CRMCardDisplay, CRMStage } from '../types/crm';
import { acceptConnectionRequest } from './connectionUtils';

export async function getCRMCards(userId: string): Promise<CRMCardDisplay[]> {
  try {
    const [cardsResult, favoritesResult] = await Promise.all([
      supabase
        .from('crm_cards')
        .select(`
          *,
          connection:connections(
            id,
            requester_user_id,
            recipient_user_id,
            status
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('favorites')
        .select('partnership_id')
        .eq('user_id', userId),
    ]);

    if (cardsResult.error) throw cardsResult.error;

    const favoriteBusinessIds = new Set(
      (favoritesResult.data || []).map((f) => f.partnership_id)
    );

    const cardsWithDirection: CRMCardDisplay[] = (cardsResult.data || []).map((card: any) => {
      const connection = card.connection;
      let connectionDirection: 'outgoing' | 'incoming' | undefined;
      let isOutgoing = false;
      let isIncoming = false;
      let canAccept = false;

      if (connection && connection.status === 'pending') {
        if (connection.requester_user_id === userId) {
          connectionDirection = 'outgoing';
          isOutgoing = true;
        } else {
          connectionDirection = 'incoming';
          isIncoming = true;
          canAccept = true;
        }
      }

      return {
        ...card,
        connectionDirection,
        isOutgoing,
        isIncoming,
        canAccept,
        isFavorite: card.partner_business_id ? favoriteBusinessIds.has(card.partner_business_id) : false,
      };
    });

    return cardsWithDirection;
  } catch (error) {
    console.error('Error fetching CRM cards:', error);
    return [];
  }
}

export async function updateCRMCardStage(
  cardId: string,
  stage: CRMStage
): Promise<{ success: boolean; message?: string }> {
  try {
    const { error } = await supabase
      .from('crm_cards')
      .update({ stage })
      .eq('id', cardId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating CRM card stage:', error);
    return { success: false, message: 'Failed to update stage' };
  }
}

export async function updateCRMCardNotes(
  cardId: string,
  notes: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { error } = await supabase
      .from('crm_cards')
      .update({ notes })
      .eq('id', cardId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating CRM card notes:', error);
    return { success: false, message: 'Failed to update notes' };
  }
}

export async function deleteCRMCard(
  cardId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { error } = await supabase
      .from('crm_cards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting CRM card:', error);
    return { success: false, message: 'Failed to delete card' };
  }
}

export async function acceptConnectionFromCRM(
  connectionId: string,
  cardId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await acceptConnectionRequest(connectionId);

    if (!result.success) {
      return result;
    }

    await updateCRMCardStage(cardId, 'Connected');

    return { success: true };
  } catch (error) {
    console.error('Error accepting connection from CRM:', error);
    return { success: false, message: 'Failed to accept connection' };
  }
}

export async function createCRMCard(
  userId: string,
  partnerUserId: string,
  connectionId: string | null = null
): Promise<{ success: boolean; cardId?: string; message?: string }> {
  try {
    const { data: partnerData } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', partnerUserId)
      .maybeSingle();

    const { data: businessData } = await supabase
      .from('businesses')
      .select('id, company_name')
      .eq('owner_user_id', partnerUserId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('crm_cards')
      .insert({
        user_id: userId,
        partner_user_id: partnerUserId,
        partner_business_id: businessData?.id || null,
        connection_id: connectionId,
        stage: 'Connection Pending',
        company_name: businessData?.company_name || '',
        partner_name: partnerData?.email || '',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, cardId: data.id };
  } catch (error) {
    console.error('Error creating CRM card:', error);
    return { success: false, message: 'Failed to create CRM card' };
  }
}
