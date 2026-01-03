import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

/**
 * Textarea Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
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
        <label className="block text-xs font-bold text-[var(--dark-text-subtle)] uppercase mb-1 ml-1 tracking-wide">
          {label}
        </label>
      )}
      <textarea
        className={`w-full bg-[var(--dark-bg-app)] border border-[var(--dark-border-default)] text-[var(--dark-text-main)] rounded-xl p-3 text-sm outline-none focus:border-[var(--dark-brand-primary)] focus:bg-[var(--dark-bg-card)] transition-all duration-200 ease-in-out placeholder:text-[var(--dark-text-subtle)] resize-none
          ${error ? 'border-[var(--dark-input-border-error)] focus:border-[var(--dark-input-border-error)]' : ''}
          ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-[var(--dark-toast-error-icon)] ml-1 font-medium animate-fade-in">{error}</span>
      )}
    </div>
  );
};

export default Textarea;
