
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({ 
  label, 
  error, 
  className = '', 
  containerClassName = '',
  ...props 
}) => {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1 tracking-wide">
          {label}
        </label>
      )}
      <textarea 
        className={`w-full bg-input-bg border border-barber-800 text-main rounded-xl p-3 text-sm outline-none focus:border-barber-gold transition-all duration-200 ease-in-out placeholder:text-muted/50 resize-none
        ${error ? 'border-red-500 focus:border-red-500' : ''}
        ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 ml-1 font-medium animate-fade-in">{error}</span>
      )}
    </div>
  );
};

export default Textarea;
