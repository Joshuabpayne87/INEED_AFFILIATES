import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gradient?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hover = false, gradient = false, children, ...props }, ref) => {
    const hoverClass = hover ? 'card-hover cursor-pointer' : '';
    const gradientClass = gradient ? 'gradient-border' : '';

    return (
      <div
        ref={ref}
        className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm ${hoverClass} ${gradientClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
