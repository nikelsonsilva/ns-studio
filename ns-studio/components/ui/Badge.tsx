
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'vip' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '',
  icon
}) => {
  
  const variants = {
    // Default: Texto 'muted' em vez de cinza fixo
    default: "bg-barber-800 text-muted border-barber-700",
    
    // Acessibilidade: Usando Emerald (mais azulado) e Rose (mais distinto) com texto mais escuro (600) para contraste
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    
    vip: "bg-barber-gold/20 text-yellow-700 dark:text-barber-gold border-barber-gold/30 font-bold",
    outline: "bg-transparent border-barber-800 text-muted"
  };

  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2.5 py-1"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${variants[variant]} ${sizes[size]} ${className} uppercase tracking-wide font-bold`}>
      {icon}
      {children}
    </span>
  );
};

export default Badge;
