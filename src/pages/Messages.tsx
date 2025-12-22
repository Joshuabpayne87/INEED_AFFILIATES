import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  Conversation,
  Message,
} from '../lib/messagingUtils';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  ChevronLeft,
  Star,
  Filter
} from 'lucide-react';

export function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationChannelRef = useRef<any>(null);
  const messagesChannelRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      loadConversations();
      setupRealtimeSubscriptions();
    }

    return () => {
      // Cleanup subscriptions
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
      }
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (selectedConversation && user) {
      loadMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id, user.id);
      setShowMobileList(false);
    }
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to new messages
    messagesChannelRef.current = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const newMessage = payload.new;
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            // Add to current conversation
            setMessages((prev) => [...prev, {
              id: newMessage.id,
              conversation_id: newMessage.conversation_id,
              sender_user_id: newMessage.sender_user_id,
              content: newMessage.content,
              is_read: newMessage.is_read,
              read_at: newMessage.read_at,
              created_at: newMessage.created_at,
              is_system_message: newMessage.is_system_message || false,
              system_message_type: newMessage.system_message_type,
            }]);
            scrollToBottom();
          }
          // Reload conversations to update last message
          loadConversations();
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    conversationChannelRef.current = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();
  };

  const loadConversations = async () => {
    if (!user) return;
    try {
      const data = await getUserConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await getConversationMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || sending) return;

    setSending(true);
    try {
      const sentMessage = await sendMessage(
        selectedConversation.id,
        user.id,
        newMessage
      );
      if (sentMessage) {
        setMessages((prev) => [...prev, sentMessage]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      (conv.other_user?.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.other_user?.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.other_user?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.other_user?.business?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'unread') {
      return (conv.unread_count || 0) > 0;
    }
    // TODO: Implement starred filter when we add that feature
    if (filter === 'starred') {
      return false; // Placeholder
    }
    return true;
  });

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return email[0]?.toUpperCase() || 'U';
  };

  const getPartnerName = (conv: Conversation) => {
    if (conv.other_user?.first_name && conv.other_user?.last_name) {
      return `${conv.other_user.first_name} ${conv.other_user.last_name}`;
    }
    return conv.other_user?.email || 'Unknown';
  };

  const getPartnerCompany = (conv: Conversation) => {
    return conv.other_user?.business?.company_name || '';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Conversations List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col ${!showMobileList && selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-heading font-bold text-navy mb-4">Messages</h1>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === 'starred'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Starred
            </button>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">No conversations yet</h3>
              <p className="text-gray-500 text-sm">
                Connect with partners to start messaging
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?.id === conversation.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {getInitials(
                      conversation.other_user?.first_name || null,
                      conversation.other_user?.last_name || null,
                      conversation.other_user?.email || ''
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-navy truncate">{getPartnerName(conversation)}</h3>
                      {conversation.last_message_at && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      )}
                    </div>
                    {getPartnerCompany(conversation) && (
                      <p className="text-sm text-gray-500 truncate">{getPartnerCompany(conversation)}</p>
                    )}
                    {conversation.last_message && (
                      <p className="text-sm text-gray-400 truncate mt-1">
                        {conversation.last_message.content}
                      </p>
                    )}
                  </div>
                  {(conversation.unread_count || 0) > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0">
                      {conversation.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${showMobileList && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button
                onClick={() => setShowMobileList(true)}
                className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center text-white font-semibold">
                {getInitials(
                  selectedConversation.other_user?.first_name || null,
                  selectedConversation.other_user?.last_name || null,
                  selectedConversation.other_user?.email || ''
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-navy">{getPartnerName(selectedConversation)}</h3>
                {getPartnerCompany(selectedConversation) && (
                  <p className="text-sm text-gray-500">{getPartnerCompany(selectedConversation)}</p>
                )}
              </div>
              <button
                onClick={() => {
                  // Navigate to partner profile
                  if (selectedConversation.other_user?.id) {
                    navigate(`/directory/${selectedConversation.other_user.id}`);
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                View Profile
              </button>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_user_id === user?.id;
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showDateSeparator = !prevMessage || 
                    new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();
                  
                  return (
                    <div key={message.id}>
                      {showDateSeparator && (
                        <div className="text-center my-4">
                          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                            {new Date(message.created_at).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            message.is_system_message
                              ? 'bg-gray-200 text-gray-600 text-center mx-auto'
                              : isOwn
                              ? 'bg-primary text-white rounded-br-md'
                              : 'bg-gray-100 text-navy rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          {!message.is_system_message && (
                            <p className={`text-xs mt-1 ${
                              isOwn ? 'text-white/70' : 'text-gray-400'
                            }`}>
                              {formatTime(message.created_at)}
                              {isOwn && message.is_read && (
                                <span className="ml-2">✓ Read</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
