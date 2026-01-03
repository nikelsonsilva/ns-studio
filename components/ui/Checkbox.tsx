import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

/**
 * Checkbox Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
const Checkbox: React.FC<CheckboxProps> = ({ label, containerClassName = '', className = '', checked, ...props }) => {
  return (
    <label className={`inline-flex items-center cursor-pointer group ${containerClassName}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          {...props}
        />
        <div className={`
          w-5 h-5 border-2 border-[var(--dark-checkbox-border)] rounded-md bg-[var(--dark-checkbox-bg)] 
          peer-checked:bg-[var(--dark-checkbox-checked-bg)] peer-checked:border-[var(--dark-checkbox-checked-border)] 
          peer-focus:ring-2 peer-focus:ring-[var(--dark-checkbox-focus-ring)] 
          transition-all duration-200 ease-in-out flex items-center justify-center
          group-hover:border-[var(--dark-checkbox-border-hover)]
        `}>
          <Check size={14} className={`text-[var(--dark-checkbox-check-icon)] transition-opacity duration-200 ${checked ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
        </div>
      </div>
      {label && (
        <span className="ml-2 text-sm text-[var(--dark-checkbox-label)] group-hover:text-[var(--dark-checkbox-label-hover)] transition-colors select-none">
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
