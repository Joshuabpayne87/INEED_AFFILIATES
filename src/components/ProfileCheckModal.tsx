import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface ProfileCheckModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ProfileCheckModal({ onComplete, onSkip }: ProfileCheckModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-[#6666FF] to-[#66FFFF] rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#001134] mb-2">
              Complete your profile to appear in the marketplace
            </h2>
          </div>
        </div>

        <div className="space-y-4 mb-8 text-gray-700">
          <p>
            Your profile is almost done! Take just 5 minutes now to complete it so you can go live.
          </p>
          <p>
            All questions must be completed for your profile to go live in the marketplace. Your email and contact details will stay private and will not appear on your public profile. Someone can only access your calendar link once you accept their connection request.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={onComplete} className="w-full">
            Complete my profile
          </Button>
          <Button variant="secondary" onClick={onSkip} className="w-full">
            Skip for now (Profile stays hidden)
          </Button>
        </div>
      </div>
    </div>
  );
}
