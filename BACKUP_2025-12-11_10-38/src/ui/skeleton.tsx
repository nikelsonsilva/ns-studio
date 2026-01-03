// src/ui/skeleton.tsx - Loading Skeleton
import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-surface/80 ${className}`} />
);

export default Skeleton;
