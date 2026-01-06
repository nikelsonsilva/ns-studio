
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
    noPadding?: boolean;
    style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    hoverEffect = false,
    onClick,
    noPadding = false,
    style
}) => {
    const baseStyle = "bg-barber-900 border border-barber-800 rounded-xl shadow-sm overflow-hidden";
    const hoverStyle = hoverEffect ? "transition-all duration-300 ease-in-out hover:border-barber-gold/50 cursor-pointer hover:shadow-xl hover:-translate-y-0.5" : "";
    const paddingStyle = noPadding ? "" : "p-6";

    return (
        <div
            onClick={onClick}
            className={`${baseStyle} ${hoverStyle} ${paddingStyle} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
};

export default Card;
