import { useState } from 'react';
import { User, MessageCircle, ExternalLink, Calendar, Check, Clock, UserPlus, Trophy } from 'lucide-react';
import { CRMCardDisplay } from '../types/crm';
import { acceptConnectionFromCRM } from '../lib/crmUtils';
import { Link } from 'react-router-dom';

interface CRMCardProps {
  card: CRMCardDisplay;
  onAccept?: () => void;
  onMessage?: () => void;
  isDragging?: boolean;
}

export function CRMCard({ card, onAccept, onMessage, isDragging }: CRMCardProps) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!card.connection?.id) return;

    setAccepting(true);
    try {
      const result = await acceptConnectionFromCRM(card.connection.id, card.id);
      if (result.success && onAccept) {
        onAccept();
      } else if (!result.success) {
        alert(result.message || 'Failed to accept connection');
      }
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection');
    } finally {
      setAccepting(false);
    }
  };

  const isConnected = card.connection?.status === 'accepted' || card.stage !== 'Connection Pending';

  return (
    <div
      className={`bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-lg transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#FF69FF] flex items-center justify-center text-white font-bold flex-shrink-0">
          {card.profile_image_url ? (
            <img
              src={card.profile_image_url}
              alt={card.partner_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-gray-900 truncate">{card.company_name || 'No Company'}</h3>
            {card.isFavorite && (
              <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">{card.partner_name}</p>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {card.isOutgoing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <Clock className="w-3 h-3" />
                Sent
              </span>
            )}

            {card.isIncoming && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                <UserPlus className="w-3 h-3" />
                Incoming
              </span>
            )}

            {isConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <Check className="w-3 h-3" />
                Connected
              </span>
            )}

            {card.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {card.last_message_preview && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600 italic truncate">
          {card.last_message_preview}
        </div>
      )}

      {card.isIncoming && card.canAccept && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">This partner wants to connect with you</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {card.canAccept && card.connection?.id && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            {accepting ? 'Accepting...' : 'Accept'}
          </button>
        )}

        {isConnected && (
          <button
            onClick={onMessage}
            className="flex-1 px-3 py-2 border-2 border-[#FF1493] text-[#FF1493] rounded-lg text-sm font-semibold hover:bg-[#FF1493] hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </button>
        )}

        <Link
          to={`/partnerships/${card.partner_business_id}`}
          className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-1.5"
        >
          <ExternalLink className="w-4 h-4" />
          View
        </Link>

        {isConnected && card.partner_business_id && (
          <a
            href={`/partnerships/${card.partner_business_id}#calendar`}
            className="px-3 py-2 border-2 border-[#6666FF] text-[#6666FF] rounded-lg text-sm font-semibold hover:bg-[#6666FF] hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
