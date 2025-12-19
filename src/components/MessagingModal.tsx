import { useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getConnection } from '../lib/connectionUtils';
import { Send, User, Lock } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
}

interface MessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  connectionId: string;
}

export function MessagingModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  connectionId,
}: MessagingModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionValid, setConnectionValid] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadId = [user?.id, recipientId].sort().join('_');

  useEffect(() => {
    if (isOpen && user) {
      validateConnection();
      loadMessages();

      const subscription = supabase
        .channel(`messages:${threadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();

            if (newMsg.sender_id !== user.id) {
              markAsRead(newMsg.id);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen, user, threadId]);

  async function validateConnection() {
    if (!user) return;

    try {
      const connection = await getConnection(user.id, recipientId);
      if (!connection || connection.status !== 'accepted') {
        setConnectionValid(false);
      } else {
        setConnectionValid(true);
      }
    } catch (error) {
      console.error('Error validating connection:', error);
      setConnectionValid(false);
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(first_name, last_name)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      const unreadMessages = (data || []).filter(
        (msg) => msg.recipient_id === user.id && !msg.is_read
      );

      for (const msg of unreadMessages) {
        await markAsRead(msg.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(messageId: string) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  }

  async function sendMessage() {
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          connection_id: connectionId,
          thread_id: threadId,
          content: newMessage.trim(),
        });

      if (error) throw error;

      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'new_message',
          title: 'New Message',
          message: `You have a new message from ${user.email}`,
          link: '/connections',
        });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Message ${recipientName}`}>
      <div className="flex flex-col h-[500px]">
        {!connectionValid && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Connection Required</p>
              <p className="text-xs text-yellow-700">You must be connected to message this user.</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg mb-4">
          {loading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[70%] rounded-lg px-4 py-2
                      ${isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                      }
                    `}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={connectionValid ? "Type your message..." : "Connect to send messages"}
            className="flex-1"
            disabled={sending || !connectionValid}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim() || !connectionValid}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
