import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
  helperText,
  error,
  required = false,
  disabled = false,
}: CheckboxProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3">
        <div
          role="checkbox"
          aria-checked={checked}
          aria-required={required}
          aria-disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={helperText ? `${id}-helper` : undefined}
          tabIndex={disabled ? -1 : 0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={`
            flex items-center justify-center w-5 h-5 mt-0.5
            rounded border-2 transition-all duration-200 cursor-pointer
            ${checked
              ? 'bg-[#6666FF] border-[#6666FF]'
              : error
              ? 'bg-white border-red-500'
              : 'bg-white border-gray-300 hover:border-[#6666FF]'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            focus:outline-none focus:ring-2 focus:ring-[#6666FF] focus:ring-offset-2
          `}
        >
          {checked && (
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          )}
        </div>

        <label
          htmlFor={id}
          onClick={handleClick}
          className={`
            flex-1 text-sm cursor-pointer select-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600 }}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      {helperText && (
        <p
          id={`${id}-helper`}
          className="text-xs text-gray-600 ml-8"
          style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
        >
          {helperText}
        </p>
      )}

      {error && (
        <p
          className="text-xs text-red-500 ml-8 font-medium"
          role="alert"
          style={{ fontFamily: 'TT Rounds Neue, sans-serif' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
