// src/ui/product-card.tsx - Product display card (e-commerce style)
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface ProductCardProps {
    name: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    category?: string;
    rating?: number;
    reviewCount?: number;
    inStock?: boolean;
    badge?: string;
    onAddToCart?: () => void;
    onFavorite?: () => void;
    isFavorite?: boolean;
    onClick?: () => void;
    className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
    name,
    price,
    originalPrice,
    imageUrl,
    category,
    rating,
    reviewCount,
    inStock = true,
    badge,
    onAddToCart,
    onFavorite,
    isFavorite = false,
    onClick,
    className,
}) => {
    const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <div
            className={cn(
                'group relative rounded-xl border border-barber-800 bg-barber-900 overflow-hidden transition-all',
                onClick && 'cursor-pointer hover:border-barber-gold/50',
                className,
            )}
            onClick={onClick}
        >
            {/* Image */}
            <div className="relative aspect-square bg-barber-800">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon name="image" size={40} className="text-gray-700" />
                    </div>
                )}

                {/* Badge */}
                {badge && (
                    <span className="absolute top-2 left-2 rounded-md bg-barber-gold px-2 py-0.5 text-[10px] font-bold text-black uppercase">
                        {badge}
                    </span>
                )}

                {/* Discount */}
                {discount > 0 && (
                    <span className="absolute top-2 right-2 rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        -{discount}%
                    </span>
                )}

                {/* Favorite Button */}
                {onFavorite && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                        className={cn(
                            'absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all',
                            'opacity-0 group-hover:opacity-100',
                            discount > 0 && 'top-10',
                        )}
                    >
                        <Icon
                            name={isFavorite ? 'heart' : 'heart'}
                            size={16}
                            className={isFavorite ? 'text-red-500 fill-red-500' : 'text-white'}
                        />
                    </button>
                )}

                {/* Out of Stock Overlay */}
                {!inStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[12px] font-bold text-white uppercase">
                            Esgotado
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3">
                {category && (
                    <p className="text-[10px] text-gray-500 uppercase mb-1">{category}</p>
                )}

                <h3 className="text-[13px] font-medium text-white line-clamp-2 min-h-[36px]">
                    {name}
                </h3>

                {/* Rating */}
                {rating !== undefined && (
                    <div className="flex items-center gap-1 mt-1">
                        <Icon name="star" size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[11px] text-gray-400">
                            {rating.toFixed(1)}
                            {reviewCount !== undefined && ` (${reviewCount})`}
                        </span>
                    </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-[16px] font-bold text-barber-gold">
                        {formatPrice(price)}
                    </span>
                    {originalPrice && originalPrice > price && (
                        <span className="text-[12px] text-gray-600 line-through">
                            {formatPrice(originalPrice)}
                        </span>
                    )}
                </div>

                {/* Add to Cart */}
                {onAddToCart && inStock && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                        className={cn(
                            'mt-3 w-full h-9 rounded-lg font-semibold text-[12px]',
                            'bg-barber-gold text-black hover:bg-yellow-500',
                            'transition-all',
                        )}
                    >
                        Adicionar
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
