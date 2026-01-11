/**
 * CalendarSkeleton Component
 * Skeleton loader para o calendário durante loading
 */

import React from 'react';

export const CalendarSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden animate-fade-in bg-black">
            {/* Left Sidebar Skeleton */}
            <div className="hidden lg:flex w-[230px] bg-zinc-900 border-r border-zinc-700 p-3 flex-col gap-3 animate-pulse">
                {/* Mini Calendar Skeleton */}
                <div className="bg-zinc-800/50 rounded-xl p-3">
                    <div className="h-5 bg-zinc-700 rounded w-24 mx-auto mb-3" />
                    <div className="grid grid-cols-7 gap-1">
                        {[...Array(35)].map((_, i) => (
                            <div key={i} className="h-6 bg-zinc-700/50 rounded" />
                        ))}
                    </div>
                </div>
                {/* Available Now Skeleton */}
                <div className="bg-zinc-800/50 rounded-xl p-3 flex-1">
                    <div className="h-4 bg-zinc-700 rounded w-28 mb-3" />
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-zinc-700/30 rounded-lg">
                                <div className="w-8 h-8 bg-zinc-700 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <div className="h-3 bg-zinc-700 rounded w-20" />
                                    <div className="h-2 bg-zinc-700/50 rounded w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header Skeleton */}
                <div className="bg-zinc-900/80 border-b border-zinc-800 p-3 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                            <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                        </div>
                        <div className="h-5 bg-zinc-800 rounded w-40" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-8 bg-zinc-800/50 rounded-lg w-24" />
                        <div className="h-8 bg-zinc-800/50 rounded-lg w-32" />
                        <div className="h-8 bg-zinc-800 rounded-lg w-28" />
                    </div>
                </div>

                {/* Grid Header Skeleton */}
                <div className="bg-zinc-900/50 border-b border-zinc-800 grid grid-cols-4 gap-px animate-pulse">
                    <div className="p-2">
                        <div className="h-4 bg-zinc-800/50 rounded w-10" />
                    </div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-2 flex items-center gap-2">
                            <div className="w-7 h-7 bg-zinc-800 rounded-full" />
                            <div className="h-4 bg-zinc-800 rounded w-20" />
                        </div>
                    ))}
                </div>

                {/* Time Grid Skeleton */}
                <div className="flex-1 overflow-auto animate-pulse">
                    <div className="grid grid-cols-4 gap-px">
                        {[...Array(12)].map((_, rowIndex) => (
                            <React.Fragment key={rowIndex}>
                                <div className="h-20 bg-zinc-900 border-b border-zinc-800/50 p-2">
                                    <div className="h-3 bg-zinc-800/50 rounded w-10" />
                                </div>
                                {[1, 2, 3].map(colIndex => (
                                    <div key={colIndex} className="h-20 bg-zinc-900/50 border-b border-zinc-800/30 p-1">
                                        {rowIndex % 3 === colIndex - 1 && (
                                            <div className="h-full bg-zinc-800/30 rounded-lg p-2">
                                                <div className="h-3 bg-zinc-700/50 rounded w-16 mb-1" />
                                                <div className="h-2 bg-zinc-700/30 rounded w-12" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarSkeleton;
