import { Calendar } from 'lucide-react';
import { Button } from './ui/Button';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBooked?: () => void;
}

export function BookingModal({ isOpen, onClose, onBooked }: BookingModalProps) {
  if (!isOpen) return null;

  const handleScheduleCall = () => {
    // Mark that they've booked the call
    localStorage.setItem('onboarding_call_booked', 'true');
    
    // Open booking calendar
    window.open('https://api.leadconnectorhq.com/widget/bookings/ineedaffiliates-onboarding', '_blank');
    
    // Grant access to platform
    if (onBooked) {
      onBooked();
    }
    
    // Close the modal
    onClose();
  };

  const handleRequestDifferentTime = () => {
    // Mark that they've requested a different time
    localStorage.setItem('onboarding_call_booked', 'true');
    
    // Open email client
    window.location.href = 'mailto:support@ineedaffiliates.com?subject=Request Different Onboarding Call Time';
    
    // Grant access to platform
    if (onBooked) {
      onBooked();
    }
    
    // Close the modal
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4">
      {/* Modal content */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-8">

        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-cyan flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Book Your Onboarding Call
          </h2>

          <p className="text-gray-600 mb-6">
            This call helps us understand your goals, introduce you to the platform, and position you to start forming profitable partnerships right away.
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
          </div>

          <p className="text-xs text-gray-500 mt-4">
            You'll be redirected to our booking calendar to find a time that works for you.
          </p>

          <p className="text-sm text-center mt-4">
            <button
              onClick={handleRequestDifferentTime}
              className="underline text-gray-600 hover:text-gray-900 transition-colors"
            >
              Request a Different Time
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
