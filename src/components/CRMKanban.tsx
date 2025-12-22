import { useState, useEffect } from 'react';
import { CRMCardDisplay, CRMStage, CRM_STAGES } from '../types/crm';
import { CRMCard } from './CRMCard';
import { updateCRMCardStage, getCRMCards } from '../lib/crmUtils';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';

const STAGE_COLORS: Record<CRMStage, string> = {
  'Connection Pending': 'bg-yellow-100 border-yellow-300',
  'Connected': 'bg-green-100 border-green-300',
  'Booked Call': 'bg-blue-100 border-blue-300',
  'Call Completed': 'bg-purple-100 border-purple-300',
  'Pending Agreement': 'bg-orange-100 border-orange-300',
  'Scheduled Collaboration': 'bg-pink-100 border-pink-300',
  'Generating Revenue': 'bg-emerald-100 border-emerald-300',
  'Inactive': 'bg-gray-100 border-gray-300',
};

export function CRMKanban() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CRMCardDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedCard, setDraggedCard] = useState<CRMCardDisplay | null>(null);
  const [draggedOverStage, setDraggedOverStage] = useState<CRMStage | null>(null);
  const [messagingLoading, setMessagingLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCards();
      setupRealtimeSubscription();
    }
  }, [user]);

  async function loadCards() {
    if (!user) return;

    setLoading(true);
    try {
      const fetchedCards = await getCRMCards(user.id);
      setCards(fetchedCards);
    } catch (error) {
      console.error('Error loading CRM cards:', error);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtimeSubscription() {
    if (!user) return;

    const subscription = supabase
      .channel(`crm_cards:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadCards();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  const cardsByStage = CRM_STAGES.reduce((acc, stage) => {
    acc[stage] = cards.filter((card) => card.stage === stage);
    return acc;
  }, {} as Record<CRMStage, CRMCardDisplay[]>);

  const handleDragStart = (card: CRMCardDisplay) => {
    if (card.stage === 'Connection Pending' && card.connection?.status !== 'accepted') {
      return;
    }
    setDraggedCard(card);
  };

  const handleDragOver = (e: React.DragEvent, stage: CRMStage) => {
    e.preventDefault();
    setDraggedOverStage(stage);
  };

  const handleDragLeave = () => {
    setDraggedOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: CRMStage) => {
    e.preventDefault();
    setDraggedOverStage(null);

    if (!draggedCard) return;

    if (draggedCard.stage === 'Connection Pending' && draggedCard.connection?.status !== 'accepted') {
      alert('Cannot move cards until connection is accepted');
      setDraggedCard(null);
      return;
    }

    if (draggedCard.stage === targetStage) {
      setDraggedCard(null);
      return;
    }

    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === draggedCard.id ? { ...card, stage: targetStage } : card
      )
    );

    const result = await updateCRMCardStage(draggedCard.id, targetStage);

    if (!result.success) {
      alert(result.message || 'Failed to update stage');
      loadCards();
    }

    setDraggedCard(null);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDraggedOverStage(null);
  };

  const handleMessagePartner = async (partnerUserId: string, connectionId: string | null) => {
    if (!user) return;

    setMessagingLoading(partnerUserId);
    try {
      const conversationId = await getOrCreateConversation(
        user.id,
        partnerUserId,
        connectionId
      );

      if (conversationId) {
        navigate(`/messages?conversation=${conversationId}`);
      } else {
        alert('Failed to open conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
      alert('Failed to open conversation. Please try again.');
    } finally {
      setMessagingLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading CRM...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {CRM_STAGES.map((stage) => {
          const stageCards = cardsByStage[stage] || [];
          const isOver = draggedOverStage === stage;

          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
              className={`flex-shrink-0 w-80 transition-all ${
                isOver ? 'ring-2 ring-[#FF1493] ring-offset-2' : ''
              }`}
            >
              <div
                className={`rounded-t-lg border-2 border-b-0 p-3 ${STAGE_COLORS[stage]}`}
              >
                <h3 className="font-bold text-gray-900 text-sm">{stage}</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {stageCards.length} {stageCards.length === 1 ? 'card' : 'cards'}
                </p>
              </div>

              <div
                className={`min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto border-2 ${
                  STAGE_COLORS[stage]
                } border-t-0 rounded-b-lg p-3 space-y-3 bg-white bg-opacity-50`}
              >
                {stageCards.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No cards in this stage
                  </div>
                ) : (
                  stageCards.map((card) => {
                    const isDraggable =
                      card.stage !== 'Connection Pending' ||
                      card.connection?.status === 'accepted';

                    return (
                      <div
                        key={card.id}
                        draggable={isDraggable}
                        onDragStart={() => handleDragStart(card)}
                        onDragEnd={handleDragEnd}
                        className={isDraggable ? 'cursor-move' : 'cursor-not-allowed'}
                      >
                        <CRMCard
                          card={card}
                          onAccept={loadCards}
                          onMessage={() => handleMessagePartner(card.partner_user_id, card.connection?.id || null)}
                          isDragging={draggedCard?.id === card.id}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
