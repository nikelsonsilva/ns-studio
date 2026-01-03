
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  containerClassName?: string;
  options: { value: string | number; label: string }[];
}

const Select: React.FC<SelectProps> = ({ 
  label, 
  icon, 
  error, 
  className = '', 
  containerClassName = '',
  options,
  ...props 
}) => {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-barber-gold transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <select
          className={`w-full bg-input-bg border border-barber-800 text-main rounded-xl py-3 text-sm outline-none focus:border-barber-gold transition-all appearance-none cursor-pointer
          ${icon ? 'pl-10 pr-10' : 'px-4 pr-10'} 
          ${error ? 'border-red-500 focus:border-red-500' : ''}
          ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-input-bg text-main">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <ChevronDown size={16} />
        </div>
      </div>
      {error && (
        <span className="text-xs text-red-500 ml-1 font-medium animate-fade-in">{error}</span>
      )}
    </div>
  );
};

export default Select;
