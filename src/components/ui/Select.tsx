import { useState, useEffect } from 'react';

interface SelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  allowOther?: boolean;
  multiSelect?: boolean;
  selectedValues?: string[];
  onMultiChange?: (values: string[]) => void;
}

export function Select({
  label,
  options,
  value,
  onChange,
  required,
  placeholder = 'Select an option',
  allowOther = false,
  multiSelect = false,
  selectedValues = [],
  onMultiChange
}: SelectProps) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  useEffect(() => {
    if (allowOther && value === 'Other') {
      setShowOtherInput(true);
    }
  }, [allowOther, value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;

    if (multiSelect && onMultiChange) {
      if (newValue && !selectedValues.includes(newValue)) {
        onMultiChange([...selectedValues, newValue]);
      }
    } else {
      onChange(newValue);
      if (allowOther && newValue === 'Other') {
        setShowOtherInput(true);
      } else {
        setShowOtherInput(false);
        setOtherValue('');
      }
    }
  };

  const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setOtherValue(newValue);
    onChange(newValue);
  };

  return (
    <div>
      <label
        className="block text-sm text-gray-700 mb-2"
        style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {multiSelect ? (
        <select
          value=""
          onChange={handleSelectChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none bg-white"
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={showOtherInput ? 'Other' : value}
          onChange={handleSelectChange}
          required={required}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none bg-white"
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {showOtherInput && !multiSelect && (
        <input
          type="text"
          value={otherValue}
          onChange={handleOtherInputChange}
          placeholder="Please specify..."
          required={required}
          className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6666FF] focus:border-[#6666FF] transition-all duration-200 outline-none"
        />
      )}
    </div>
  );
}
