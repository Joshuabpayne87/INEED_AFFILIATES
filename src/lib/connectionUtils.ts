import { supabase } from './supabase';

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

interface Connection {
  id: string;
  requester_user_id: string;
  recipient_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  accepted_at: string | null;
}

export async function getConnectionStatus(
  currentUserId: string,
  profileUserId: string
): Promise<ConnectionStatus> {
  if (currentUserId === profileUserId) {
    return 'none';
  }

  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_user_id.eq.${currentUserId},recipient_user_id.eq.${profileUserId}),and(requester_user_id.eq.${profileUserId},recipient_user_id.eq.${currentUserId})`)
      .maybeSingle();

    if (error) throw error;

    if (!data) return 'none';

    if (data.status === 'accepted') return 'accepted';

    if (data.status === 'pending') {
      if (data.requester_user_id === currentUserId) {
        return 'pending_sent';
      } else {
        return 'pending_received';
      }
    }

    return 'none';
  } catch (error) {
    console.error('Error getting connection status:', error);
    return 'none';
  }
}

export async function getConnection(
  userId1: string,
  userId2: string
): Promise<Connection | null> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_user_id.eq.${userId1},recipient_user_id.eq.${userId2}),and(requester_user_id.eq.${userId2},recipient_user_id.eq.${userId1})`)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting connection:', error);
    return null;
  }
}

export async function sendConnectionRequest(
  requesterId: string,
  recipientId: string
): Promise<{ success: boolean; connectionId?: string; message?: string }> {
  try {
    const existing = await getConnection(requesterId, recipientId);

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, message: 'Already connected' };
      } else if (existing.status === 'pending') {
        return { success: false, message: 'Connection request already sent' };
      }
    }

    const { data, error } = await supabase
      .from('connections')
      .insert({
        requester_user_id: requesterId,
        recipient_user_id: recipientId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'connection_request',
        title: 'New Connection Request',
        message: 'You have a new connection request',
        link: '/connections',
      });

    return { success: true, connectionId: data.id };
  } catch (error) {
    console.error('Error sending connection request:', error);
    return { success: false, message: 'Failed to send connection request' };
  }
}

export async function acceptConnectionRequest(
  connectionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { error: updateError } = await supabase
      .from('connections')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (updateError) throw updateError;

    const { data: connection } = await supabase
      .from('connections')
      .select('requester_user_id, recipient_user_id')
      .eq('id', connectionId)
      .single();

    if (connection) {
      await supabase
        .from('notifications')
        .insert({
          user_id: connection.requester_user_id,
          type: 'connection_accepted',
          title: 'Connection Accepted!',
          message: 'Your connection request has been accepted.',
          link: '/connections',
        });

      // Get business IDs for both users to update offer vault status
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, owner_user_id')
        .in('owner_user_id', [connection.requester_user_id, connection.recipient_user_id]);

      if (businesses && businesses.length > 0) {
        const requesterBusiness = businesses.find(b => b.owner_user_id === connection.requester_user_id);
        const recipientBusiness = businesses.find(b => b.owner_user_id === connection.recipient_user_id);

        const updates = [];
        
        if (recipientBusiness) {
          updates.push(
            supabase
              .from('offer_vault')
              .update({ status: 'approved' })
              .eq('user_id', connection.requester_user_id)
              .eq('business_id', recipientBusiness.id)
              .eq('status', 'pending_connection')
          );
        }

        if (requesterBusiness) {
          updates.push(
            supabase
              .from('offer_vault')
              .update({ status: 'approved' })
              .eq('user_id', connection.recipient_user_id)
              .eq('business_id', requesterBusiness.id)
              .eq('status', 'pending_connection')
          );
        }

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error accepting connection request:', error);
    return { success: false, message: 'Failed to accept connection request' };
  }
}
