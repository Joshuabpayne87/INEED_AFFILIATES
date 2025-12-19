import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Tag, Loader2 } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceeed: (promoCode: string) => Promise<void>;
  productName: string;
  isLoading: boolean;
}

export function CheckoutModal({ isOpen, onClose, onProceeed, productName, isLoading }: CheckoutModalProps) {
  const [promoCode, setPromoCode] = useState('');

  const handleProceed = async () => {
    await onProceeed(promoCode);
    setPromoCode('');
  };

  const handleClose = () => {
    setPromoCode('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Complete Your Purchase" size="sm">
      <div className="space-y-6">
        <p className="text-gray-600">
          You're about to get started with <span className="font-semibold text-gray-900">{productName} Membership</span>
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Have a Promo Code?</h3>
              <p className="text-xs text-gray-600">Optional: Enter your promotional code to receive discounts</p>
            </div>
          </div>
        </div>

        <div>
          <Input
            type="text"
            placeholder="Enter promo code (optional)"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Go to Payment'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
