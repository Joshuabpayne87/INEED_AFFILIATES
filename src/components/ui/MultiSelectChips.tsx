import { Check } from 'lucide-react';

interface MultiSelectChipsProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  required?: boolean;
}

export function MultiSelectChips({ label, options, value, onChange, required }: MultiSelectChipsProps) {
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              className={`
                px-4 py-2 rounded-full font-medium transition-all duration-200
                flex items-center gap-2
                ${isSelected
                  ? 'bg-gradient-to-r from-[#6666FF] to-[#66FFFF] text-white shadow-md transform scale-105'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-[#6666FF] hover:shadow-sm'
                }
              `}
            >
              {isSelected && <Check className="w-4 h-4" />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
