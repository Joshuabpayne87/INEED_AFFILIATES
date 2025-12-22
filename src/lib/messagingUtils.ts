import { supabase } from './supabase';

export interface Conversation {
  id: string;
  participant_1_user_id: string;
  participant_2_user_id: string;
  connection_id: string | null;
  created_at: string;
  last_message_at: string | null;
  participant_1_last_read_at: string | null;
  participant_2_last_read_at: string | null;
  other_user?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    business?: {
      company_name: string;
      logo_url: string | null;
    };
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_user_id: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  is_system_message: boolean;
  system_message_type: string | null;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  user1Id: string,
  user2Id: string,
  connectionId?: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_user_1_id: user1Id,
      p_user_2_id: user2Id,
      p_connection_id: connectionId || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    return null;
  }
}

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:users!conversations_participant_1_user_id_fkey(
          id,
          email,
          first_name,
          last_name,
          businesses(company_name, logo_url)
        ),
        participant_2:users!conversations_participant_2_user_id_fkey(
          id,
          email,
          first_name,
          last_name,
          businesses(company_name, logo_url)
        ),
        messages:messages(
          id,
          content,
          created_at,
          sender_user_id
        ),
        message_notifications!inner(unread_count)
      `)
      .or(`participant_1_user_id.eq.${userId},participant_2_user_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    return (data || []).map((conv: any) => {
      const isParticipant1 = conv.participant_1_user_id === userId;
      const otherUser = isParticipant1 ? conv.participant_2 : conv.participant_1;
      const lastMessage = conv.messages && conv.messages.length > 0 
        ? conv.messages.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
        : null;

      return {
        id: conv.id,
        participant_1_user_id: conv.participant_1_user_id,
        participant_2_user_id: conv.participant_2_user_id,
        connection_id: conv.connection_id,
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        participant_1_last_read_at: conv.participant_1_last_read_at,
        participant_2_last_read_at: conv.participant_2_last_read_at,
        other_user: {
          id: otherUser.id,
          email: otherUser.email,
          first_name: otherUser.first_name,
          last_name: otherUser.last_name,
          business: Array.isArray(otherUser.businesses) && otherUser.businesses.length > 0 
            ? otherUser.businesses[0] 
            : (otherUser.businesses && !Array.isArray(otherUser.businesses) ? otherUser.businesses : null),
        },
        last_message: lastMessage ? {
          content: lastMessage.content,
          created_at: lastMessage.created_at,
          sender_user_id: lastMessage.sender_user_id,
        } : undefined,
        unread_count: conv.message_notifications?.[0]?.unread_count || 0,
      };
    });
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_user_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((msg: any) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_user_id: msg.sender_user_id,
      content: msg.content,
      is_read: msg.is_read,
      read_at: msg.read_at,
      created_at: msg.created_at,
      is_system_message: msg.is_system_message || false,
      system_message_type: msg.system_message_type,
      sender: msg.sender ? {
        first_name: msg.sender.first_name,
        last_name: msg.sender.last_name,
        email: msg.sender.email,
      } : undefined,
    }));
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderUserId: string,
  content: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_user_id: senderUserId,
        content: content.trim(),
        is_read: false,
      })
      .select(`
        *,
        sender:users!messages_sender_user_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      conversation_id: data.conversation_id,
      sender_user_id: data.sender_user_id,
      content: data.content,
      is_read: data.is_read,
      read_at: data.read_at,
      created_at: data.created_at,
      is_system_message: data.is_system_message || false,
      system_message_type: data.system_message_type,
      sender: data.sender ? {
        first_name: data.sender.first_name,
        last_name: data.sender.last_name,
        email: data.sender.email,
      } : undefined,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
}

/**
 * Mark conversation messages as read
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('mark_conversation_messages_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return false;
  }
}

/**
 * Get total unread message count for a user
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('message_notifications')
      .select('unread_count')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).reduce((sum, notif) => sum + (notif.unread_count || 0), 0);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Create a system message
 */
export async function createSystemMessage(
  conversationId: string,
  systemMessageType: 'connection_accepted' | 'call_booked' | 'referral_received',
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    let content = '';
    switch (systemMessageType) {
      case 'connection_accepted':
        content = 'Connection accepted';
        break;
      case 'call_booked':
        content = metadata?.date 
          ? `Call booked for ${new Date(metadata.date).toLocaleDateString()}`
          : 'Call booked';
        break;
      case 'referral_received':
        content = 'New referral received from this partner';
        break;
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_user_id: '00000000-0000-0000-0000-000000000000', // System user ID
        content,
        is_system_message: true,
        system_message_type: systemMessageType,
        is_read: false,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating system message:', error);
    return false;
  }
}

