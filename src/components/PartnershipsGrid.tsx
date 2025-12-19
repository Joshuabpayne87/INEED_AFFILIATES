import PartnershipCard from './PartnershipCard';

export interface Partnership {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  website: string;
  description: string;
  partnership_type: string;
  industry: string;
  commission_rate: string;
  requirements: string;
  logo_url: string | null;
  featured: boolean;
}

interface PartnershipsGridProps {
  partnerships: Partnership[];
  isLoading: boolean;
}

export default function PartnershipsGrid({ partnerships, isLoading }: PartnershipsGridProps) {
  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-white" id="partnerships">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-96 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (partnerships.length === 0) {
    return (
      <section className="py-16 px-4 bg-white" id="partnerships">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-gray-50 rounded-2xl p-12 border border-gray-200">
            <p className="text-xl text-gray-600">No partnerships found matching your criteria.</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search terms.</p>
          </div>
        </div>
      </section>
    );
  }

  const featuredPartnerships = partnerships.filter((p) => p.featured);
  const regularPartnerships = partnerships.filter((p) => !p.featured);

  return (
    <section className="py-16 px-4 bg-white" id="partnerships">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[#001134] mb-2">
              Partnership Opportunities
            </h2>
            <p className="text-gray-600">
              {partnerships.length}{' '}
              {partnerships.length === 1 ? 'opportunity' : 'opportunities'} available
            </p>
          </div>
        </div>

        {featuredPartnerships.length > 0 && (
          <>
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[#001134] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#6666FF] rounded-full" />
                Featured Partnerships
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {featuredPartnerships.map((partnership) => (
                <PartnershipCard key={partnership.id} partnership={partnership} />
              ))}
            </div>
          </>
        )}

        {regularPartnerships.length > 0 && (
          <>
            {featuredPartnerships.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-[#001134] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#66FFFF] rounded-full" />
                  All Partnerships
                </h3>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPartnerships.map((partnership) => (
                <PartnershipCard key={partnership.id} partnership={partnership} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
