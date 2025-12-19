import { Star, TrendingUp, Users, Building2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Partnership {
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

interface PartnershipCardProps {
  partnership: Partnership;
}

const typeColors = {
  affiliate: 'bg-blue-50 text-blue-700 border-blue-200',
  jv: 'bg-purple-50 text-purple-700 border-purple-200',
  strategic: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  reseller: 'bg-amber-50 text-amber-700 border-amber-200',
};

const typeLabels = {
  affiliate: 'Affiliate',
  jv: 'JV Partner',
  strategic: 'Strategic',
  reseller: 'Reseller',
};

export default function PartnershipCard({ partnership }: PartnershipCardProps) {
  const typeColor =
    typeColors[partnership.partnership_type as keyof typeof typeColors] ||
    typeColors.affiliate;
  const typeLabel =
    typeLabels[partnership.partnership_type as keyof typeof typeLabels] ||
    partnership.partnership_type;

  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
  }, [partnership.id]);

  const checkFavoriteStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('partnership_id', partnership.id)
      .maybeSingle();

    setIsFavorited(!!data);
  };

  const toggleFavorite = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in to bookmark partnerships');
      return;
    }

    setIsLoading(true);

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('partnership_id', partnership.id);
      setIsFavorited(false);
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, partnership_id: partnership.id });
      setIsFavorited(true);
    }

    setIsLoading(false);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden card-pop ${
        partnership.featured ? 'ring-2 ring-[#6666FF] ring-opacity-50' : ''
      }`}
    >
      {partnership.featured && (
        <div className="bg-gradient-to-r from-[#6666FF] to-[#66FFFF] px-4 py-2 flex items-center justify-center gap-2">
          <Star className="w-4 h-4 text-white fill-white" />
          <span className="text-white text-sm font-bold">Featured Partnership</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-[#6666FF]/10 to-[#66FFFF]/10 rounded-xl flex items-center justify-center border border-gray-100">
              <Building2 className="w-7 h-7 text-[#6666FF]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#001134] mb-1">
                {partnership.company_name}
              </h3>
              <span
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${typeColor}`}
              >
                {typeLabel}
              </span>
            </div>
          </div>
          <button
            onClick={toggleFavorite}
            disabled={isLoading}
            className="text-3xl hover:scale-110 transition-transform disabled:opacity-50"
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            style={{ filter: isFavorited ? 'none' : 'grayscale(100%) opacity(0.4)' }}
          >
            🏆
          </button>
        </div>

        <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
          {partnership.description}
        </p>

        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-[#6666FF]" />
            <span className="text-gray-700">
              <span className="font-semibold text-[#001134]">Commission:</span>{' '}
              {partnership.commission_rate || 'Contact for details'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-[#66FFFF]" />
            <span className="text-gray-700">
              <span className="font-semibold text-[#001134]">Industry:</span>{' '}
              {partnership.industry}
            </span>
          </div>
        </div>

        {partnership.requirements && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-[#001134]">Requirements:</span>{' '}
              {partnership.requirements}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Link
            to={`/business/${partnership.id}`}
            className="flex-1 bg-[#6666FF] hover:bg-[#5555EE] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover-pop"
          >
            View Details
            <Eye className="w-4 h-4" />
          </Link>
          <button className="relative px-4 py-2.5 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] rounded-lg text-sm font-semibold hover-pop group">
            <span className="absolute inset-[2px] bg-white rounded-[6px] group-hover:bg-transparent transition-all"></span>
            <span className="relative z-10 bg-gradient-to-r from-[#FF1493] to-[#FF69FF] bg-clip-text text-transparent group-hover:text-white transition-colors">
              Contact
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
