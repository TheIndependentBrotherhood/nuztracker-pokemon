'use client';

import { useRouter } from 'next/navigation';

interface Props {
  showBack?: boolean;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ showBack, title, subtitle, actions }: Props) {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-40 border-b border-slate-700/50 shadow-lg"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <div className="mx-auto max-w-screen-2xl px-4 py-3 flex items-center gap-4">
        {showBack && (
          <button
            onClick={() => router.push('/')}
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 shrink-0"
          >
            ← Back
          </button>
        )}

        {!showBack && (
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 group"
          >
            <span className="text-xl font-black tracking-wider gradient-text">
              NuzTracker
            </span>
            <span className="text-slate-500 text-xs hidden sm:block">Nuzlocke Tracker</span>
          </button>
        )}

        {title && (
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-base leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-slate-400 capitalize truncate">{subtitle}</p>
            )}
          </div>
        )}

        {!title && <div className="flex-1" />}

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
