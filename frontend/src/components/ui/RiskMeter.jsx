import React from 'react';

const colorMap = {
  SECURE: 'bg-emerald-500',
  LOW: 'bg-blue-500',
  MEDIUM: 'bg-amber-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
  UNRESOLVED: 'bg-slate-400',
  CONFLICT: 'bg-purple-500'
};

export function RiskMeter({ level, label }) {
  const normalizedLevel = (level || '').toUpperCase();
  const bgClass = colorMap[normalizedLevel] || 'bg-slate-200';
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2.5 h-2.5 rounded-full ${bgClass}`}></div>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
    </div>
  );
}
