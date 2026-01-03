// src/ui/tracking-map.tsx - Order/delivery tracking map placeholder
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface TrackingPoint {
    id: string;
    label: string;
    iconName?: IconName;
    status: 'completed' | 'current' | 'pending';
}

export interface TrackingMapProps {
    origin?: string;
    destination?: string;
    currentLocation?: string;
    estimatedTime?: string;
    distance?: string;
    trackingPoints?: TrackingPoint[];
    mapImageUrl?: string;
    onRefresh?: () => void;
    className?: string;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
    origin,
    destination,
    currentLocation,
    estimatedTime,
    distance,
    trackingPoints = [],
    mapImageUrl,
    onRefresh,
    className,
}) => {
    return (
        <div
            className={cn(
                'rounded-xl border border-barber-800 bg-barber-900 overflow-hidden',
                className,
            )}
        >
            {/* Map Placeholder */}
            <div className="relative h-48 bg-barber-800">
                {mapImageUrl ? (
                    <img
                        src={mapImageUrl}
                        alt="Mapa de rastreamento"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <Icon name="map" size={40} className="text-gray-700" />
                        <span className="text-[12px] text-gray-600">Mapa de Rastreamento</span>
                    </div>
                )}

                {/* Refresh Button */}
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                        <Icon name="refresh-cw" size={16} />
                    </button>
                )}

                {/* Current Location Indicator */}
                {currentLocation && (
                    <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/70 backdrop-blur-sm p-2">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-barber-gold animate-pulse">
                                <Icon name="navigation" size={12} className="text-black" />
                            </div>
                            <span className="text-[12px] text-white truncate">
                                {currentLocation}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Bar */}
            {(estimatedTime || distance) && (
                <div className="flex items-center justify-center gap-6 p-3 border-b border-barber-800">
                    {estimatedTime && (
                        <div className="flex items-center gap-2">
                            <Icon name="clock" size={16} className="text-barber-gold" />
                            <span className="text-[13px] text-white font-medium">
                                {estimatedTime}
                            </span>
                        </div>
                    )}
                    {distance && (
                        <div className="flex items-center gap-2">
                            <Icon name="map-pin" size={16} className="text-gray-500" />
                            <span className="text-[13px] text-gray-400">
                                {distance}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Origin & Destination */}
            <div className="p-4 space-y-3">
                {origin && (
                    <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Origem</p>
                            <p className="text-[13px] text-white">{origin}</p>
                        </div>
                    </div>
                )}

                {origin && destination && (
                    <div className="ml-3 h-4 border-l-2 border-dashed border-barber-800" />
                )}

                {destination && (
                    <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase">Destino</p>
                            <p className="text-[13px] text-white">{destination}</p>
                        </div>
                    </div>
                )}

                {/* Tracking Points */}
                {trackingPoints.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-barber-800">
                        <p className="text-[11px] text-gray-500 uppercase mb-3">Progresso</p>
                        <div className="flex items-center justify-between">
                            {trackingPoints.map((point, i) => {
                                const isLast = i === trackingPoints.length - 1;
                                const statusColors = {
                                    completed: 'bg-green-500 text-black',
                                    current: 'bg-barber-gold text-black animate-pulse',
                                    pending: 'bg-barber-800 text-gray-600',
                                };
                                const lineColors = {
                                    completed: 'bg-green-500',
                                    current: 'bg-barber-gold',
                                    pending: 'bg-barber-800',
                                };

                                return (
                                    <React.Fragment key={point.id}>
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={cn(
                                                    'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                                                    statusColors[point.status],
                                                )}
                                            >
                                                <Icon
                                                    name={point.iconName ?? (point.status === 'completed' ? 'check' : 'circle')}
                                                    size={14}
                                                />
                                            </div>
                                            <span className="mt-1 text-[10px] text-gray-500 text-center max-w-[60px]">
                                                {point.label}
                                            </span>
                                        </div>
                                        {!isLast && (
                                            <div
                                                className={cn(
                                                    'flex-1 h-0.5 mx-1',
                                                    lineColors[point.status],
                                                )}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrackingMap;
