
import React from 'react';
import Skeleton from './ui/Skeleton';
import Card from './ui/Card';

// Header comum para a maioria das páginas
const HeaderSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Skeleton className="md:col-span-2 h-24 rounded-xl" />
    <Skeleton className="h-24 rounded-xl" />
    <Skeleton className="h-24 rounded-xl" />
  </div>
);

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* 3 Large Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
};

export const CalendarSkeleton = () => {
  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      {/* Header Controls */}
      <div className="bg-zinc-800 p-4 border-b border-zinc-700 flex justify-between items-center">
        <div className="flex gap-4">
           <Skeleton className="h-10 w-32" />
           <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex gap-4">
           <Skeleton className="h-10 w-24" />
           <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-zinc-900 border-r border-zinc-700 p-4 hidden lg:block space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        
        {/* Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 gap-4 overflow-hidden">
            <div className="grid grid-cols-8 gap-4 h-full">
                <div className="col-span-1 space-y-4 pt-14">
                    {[...Array(10)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="col-span-2 space-y-4">
                        <Skeleton className="h-14 w-full mb-4" /> {/* Column Header */}
                        {[...Array(5)].map((_, j) => (
                            <Skeleton key={j} className="h-24 w-full rounded-lg" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export const ClientsSkeleton = () => {
  return (
    <div className="space-y-6 pb-20">
      <HeaderSkeleton />
      
      {/* Search Bar */}
      <div className="flex justify-between gap-4 mb-6">
         <Skeleton className="h-12 flex-1 rounded-xl" />
         <Skeleton className="h-12 w-24 rounded-xl" />
      </div>

      {/* List Items */}
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} noPadding className="p-4 flex items-center gap-4 bg-zinc-900">
             <Skeleton className="w-12 h-12 rounded-full shrink-0" />
             <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
             </div>
             <div className="hidden md:block space-y-2 w-32">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
             </div>
             <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          </Card>
        ))}
      </div>
    </div>
  );
};

export const FinanceSkeleton = () => {
  return (
    <div className="space-y-6 pb-20">
      <HeaderSkeleton />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Skeleton className="h-80 lg:col-span-1 rounded-xl" />
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
      </div>
    </div>
  );
};

export const GenericListSkeleton = () => {
    return (
        <div className="space-y-6 pb-20">
            <HeaderSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
            </div>
        </div>
    );
};
