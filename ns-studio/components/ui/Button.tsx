
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props 
}) => {
  
  const baseStyles = "font-bold rounded-xl transition-all duration-200 ease-in-out flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variants = {
    // Primário: Usa 'text-inverted' (Preto no Dourado / Branco no Roxo)
    primary: "bg-barber-gold hover:bg-barber-goldhover text-inverted shadow-md hover:shadow-amber-500/20",
    
    // Secundário: Usa 'text-main' para garantir contraste sobre o fundo cinza claro/escuro
    secondary: "bg-barber-800 hover:bg-barber-700 text-main shadow-sm hover:shadow-md",
    
    // Outline: Borda e texto adaptáveis
    outline: "bg-transparent border border-barber-800 text-muted hover:text-main hover:border-barber-gold hover:bg-barber-gold/5",
    
    // Ghost: Texto mutado que escurece/clareia no hover
    ghost: "bg-transparent text-muted hover:text-main hover:bg-barber-800/50",
    
    danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 h-8",
    md: "text-sm px-4 py-2.5 h-11",
    lg: "text-base px-6 py-3.5 h-14",
    icon: "p-2 w-10 h-10 flex items-center justify-center"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
