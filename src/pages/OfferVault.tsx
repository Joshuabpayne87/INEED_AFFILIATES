import { Card } from '../components/ui/Card';

export function OfferVault() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          My Offer Vault
        </h1>
        <p className="text-gray-600">Your personal offers to promote</p>
      </div>
      <Card className="text-center py-12">
        <p className="text-gray-500">Offer vault coming soon</p>
      </Card>
    </div>
  );
}
