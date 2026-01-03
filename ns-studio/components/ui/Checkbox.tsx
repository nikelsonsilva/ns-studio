
import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, containerClassName = '', className = '', ...props }) => {
  return (
    <label className={`inline-flex items-center cursor-pointer group ${containerClassName}`}>
      <div className="relative">
        <input 
          type="checkbox" 
          className="peer sr-only" 
          {...props} 
        />
        <div className={`
          w-5 h-5 border-2 border-barber-700 rounded-md bg-barber-900 
          peer-checked:bg-barber-gold peer-checked:border-barber-gold 
          peer-focus:ring-2 peer-focus:ring-barber-gold/30 
          transition-all duration-200 ease-in-out flex items-center justify-center
          group-hover:border-barber-600
        `}>
          <Check size={14} className="text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-200" strokeWidth={3} />
        </div>
      </div>
      {label && (
        <span className="ml-2 text-sm text-gray-400 group-hover:text-gray-300 transition-colors select-none">
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
