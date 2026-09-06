import React from 'react';

const colorStyles = {
  secure: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  low: 'bg-blue-50 text-blue-700 border border-blue-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high: 'bg-orange-50 text-orange-700 border border-orange-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
  unresolved: 'bg-slate-100 text-slate-700 border border-slate-200',
  conflict: 'bg-purple-50 text-purple-700 border border-purple-200',
};

export function Badge({ children, variant = 'unresolved', className = '' }) {
  const styles = colorStyles[variant] || colorStyles.unresolved;
  
  return (
    <span className={`premium-badge ${styles} ${className}`}>
      {children}
    </span>
  );
}
