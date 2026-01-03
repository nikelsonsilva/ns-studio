import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <Check className="text-green-500" size={20} />;
            case 'error':
                return <X className="text-red-500" size={20} />;
            default:
                return <Check className="text-barber-gold" size={20} />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success':
                return 'bg-green-900/90 border-green-500';
            case 'error':
                return 'bg-red-900/90 border-red-500';
            default:
                return 'bg-barber-900/90 border-barber-gold';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className={`${getBgColor()} border-l-4 rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[280px] backdrop-blur-sm`}>
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <p className="text-white font-medium text-sm flex-1">{message}</p>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
