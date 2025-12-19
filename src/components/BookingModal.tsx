import { X, Calendar } from 'lucide-react';
import { Button } from './ui/Button';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookingModal({ isOpen, onClose }: BookingModalProps) {
  if (!isOpen) return null;

  const handleScheduleCall = () => {
    window.open('https://api.leadconnectorhq.com/widget/bookings/ineedaffiliates-onboarding', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Book Your Onboarding Call
          </h2>

          <p className="text-gray-600 mb-6">
            Schedule a personalized onboarding call with our team to get started on the right foot and maximize your success with ineedaffiliates.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleScheduleCall}
              variant="gradient"
              className="w-full"
              size="lg"
            >
              Schedule Call Now
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              I'll Schedule Later
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            You'll be redirected to our booking calendar to find a time that works for you.
          </p>
        </div>
      </div>
    </div>
  );
}
