import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  containerClassName?: string;
  options: { value: string | number; label: string }[];
}

/**
 * Select Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
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
        <label className="block text-xs font-semibold text-[var(--dark-text-muted)] uppercase mb-1.5 ml-0.5 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-0 bottom-0 flex items-center text-[var(--dark-text-subtle)] group-focus-within:text-[var(--dark-brand-primary)] transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <select
          className={`w-full h-11 bg-[var(--dark-bg-card)] border border-[var(--dark-border-default)] text-[var(--dark-text-main)] rounded-xl py-3 text-sm outline-none hover:border-[var(--dark-border-strong)] focus:border-[var(--dark-input-border-focus)] focus:ring-4 focus:ring-[var(--dark-checkbox-focus-ring)] transition-all appearance-none cursor-pointer
            ${icon ? 'pl-10 pr-10' : 'px-4 pr-10'} 
            ${error ? 'border-[var(--dark-input-border-error)] focus:border-[var(--dark-input-border-error)]' : ''}
            ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--dark-bg-card)] text-[var(--dark-text-main)]">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-0 bottom-0 flex items-center text-[var(--dark-text-subtle)] pointer-events-none">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && (
        <span className="text-xs text-[var(--dark-toast-error-icon)] ml-1 font-medium animate-fade-in">{error}</span>
      )}
    </div>
  );
};

export default Select;
