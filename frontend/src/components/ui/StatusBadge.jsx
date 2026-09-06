import React from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  AlertTriangle,
  MinusCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

export default function StatusBadge({ status, count, size = 'sm', className = '' }) {
  const norm = (status || '').toUpperCase().trim();

  const sizeClasses = {
    xs: 'text-xs px-2 py-0.5 space-x-1 font-medium',
    sm: 'text-xs px-2.5 py-1 space-x-1.5 font-semibold',
    md: 'text-sm px-3 py-1 space-x-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 space-x-2 font-bold',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  const iconClass = iconSizes[size] || iconSizes.sm;
  const paddingClass = sizeClasses[size] || sizeClasses.sm;

  // PASS / VERIFIED / CONFIRMED_SAFE
  if (norm === 'PASS' || norm === 'PASSED' || norm === 'VERIFIED' || norm === 'CONFIRMED_SAFE' || norm === 'COMPLIANT') {
    return (
      <span
        className={`inline-flex items-center font-mono rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xs ${paddingClass} ${className}`}
      >
        <CheckCircle2 className={`${iconClass} text-emerald-400 shrink-0`} />
        <span>{count !== undefined ? `${count} ` : ''}{norm === 'CONFIRMED_SAFE' ? 'CONFIRMED SAFE' : norm === 'VERIFIED' ? 'VERIFIED' : 'PASS'}</span>
      </span>
    );
  }

  // FAIL / FAILED / CRITICAL / CONFIRMED_VIOLATION
  if (norm === 'FAIL' || norm === 'FAILED' || norm === 'CRITICAL' || norm === 'CONFIRMED_VIOLATION' || norm === 'NON_COMPLIANT') {
    return (
      <span
        className={`inline-flex items-center font-mono rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-xs ${paddingClass} ${className}`}
      >
        <AlertOctagon className={`${iconClass} text-rose-400 shrink-0`} />
        <span>{count !== undefined ? `${count} ` : ''}{norm === 'CONFIRMED_VIOLATION' ? 'VIOLATION' : 'FAIL'}</span>
      </span>
    );
  }

  // UNRESOLVED / OPEN / CANNOT_RESOLVE
  if (norm === 'UNRESOLVED' || norm === 'OPEN' || norm === 'CANNOT_RESOLVE') {
    return (
      <span
        className={`inline-flex items-center font-mono rounded-md border border-amber-500/35 bg-amber-500/10 text-amber-300 shadow-xs ${paddingClass} ${className}`}
      >
        <HelpCircle className={`${iconClass} text-amber-400 shrink-0`} />
        <span>{count !== undefined ? `${count} ` : ''}{norm === 'CANNOT_RESOLVE' ? 'CANNOT RESOLVE' : 'UNRESOLVED'}</span>
      </span>
    );
  }

  // AWAITING_REVIEW / ANALYZING / PROCESSING
  if (norm === 'AWAITING_REVIEW' || norm === 'ANALYZING' || norm === 'PROCESSING') {
    return (
      <span
        className={`inline-flex items-center font-mono rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-xs ${paddingClass} ${className}`}
      >
        {norm === 'ANALYZING' || norm === 'PROCESSING' ? (
          <RefreshCw className={`${iconClass} text-cyan-400 animate-spin shrink-0`} />
        ) : (
          <Clock className={`${iconClass} text-cyan-400 shrink-0`} />
        )}
        <span>{count !== undefined ? `${count} ` : ''}{norm === 'AWAITING_REVIEW' ? 'REVIEW PENDING' : norm}</span>
      </span>
    );
  }

  // CONFLICT
  if (norm === 'CONFLICT') {
    return (
      <span
        className={`inline-flex items-center font-mono rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-xs ${paddingClass} ${className}`}
      >
        <AlertTriangle className={`${iconClass} text-purple-400 shrink-0`} />
        <span>{count !== undefined ? `${count} ` : ''}CONFLICT</span>
      </span>
    );
  }

  // RESOLVED
  if (norm === 'RESOLVED' || norm === 'RESOLVED_WITH_CONTEXT') {
    return (
      <span
        className={`inline-flex items-center font-mono rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xs ${paddingClass} ${className}`}
      >
        <CheckCircle2 className={`${iconClass} text-emerald-400 shrink-0`} />
        <span>{count !== undefined ? `${count} ` : ''}RESOLVED</span>
      </span>
    );
  }

  // Default: N/A or neutral
  return (
    <span
      className={`inline-flex items-center font-mono rounded-md border border-slate-700/60 bg-slate-800/40 text-slate-300 shadow-xs ${paddingClass} ${className}`}
    >
      <MinusCircle className={`${iconClass} text-slate-400 shrink-0`} />
      <span>{count !== undefined ? `${count} ` : ''}{norm || 'N/A'}</span>
    </span>
  );
}
