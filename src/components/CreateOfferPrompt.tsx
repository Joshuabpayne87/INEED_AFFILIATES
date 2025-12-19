import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, X, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

interface CreateOfferPromptProps {
  onDismiss: () => void;
}

export function CreateOfferPrompt({ onDismiss }: CreateOfferPromptProps) {
  const navigate = useNavigate();

  const handleCreateOffer = () => {
    navigate('/settings?tab=offers');
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="relative bg-gradient-to-br from-blue-500 via-[#6666FF] to-purple-600 p-8 text-white">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-full blur-xl"></div>
              <div className="relative bg-white/20 backdrop-blur-sm p-4 rounded-full">
                <Package className="w-12 h-12" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">
            Welcome Aboard!
          </h2>
          <div className="flex items-center justify-center gap-2 text-white/90">
            <Sparkles className="w-4 h-4" />
            <p className="text-sm font-medium">Let's get you started</p>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-gray-800 font-medium mb-2">
              Ready to attract partners?
            </p>
            <p className="text-sm text-gray-700">
              Create your first offer to showcase what you have to potential partners.
              The more detailed your offers, the easier it is for the right partners to find you!
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-sm">
                1
              </div>
              <p className="text-sm text-gray-700">Add your offer details and commission structure</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-sm">
                2
              </div>
              <p className="text-sm text-gray-700">Get discovered by partners looking for offers like yours</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-sm">
                3
              </div>
              <p className="text-sm text-gray-700">Start building profitable partnerships</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={onDismiss}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              variant="gradient"
              onClick={handleCreateOffer}
              className="flex-1"
            >
              <Package className="w-4 h-4 mr-2" />
              Create Offer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
