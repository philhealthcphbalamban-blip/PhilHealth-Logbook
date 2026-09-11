'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>;

  return (
    <div className="flex items-center p-1 bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow-inner">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
          theme === 'light' 
            ? 'bg-white text-emerald-700 shadow-sm font-extrabold' 
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
        title="Light Theme"
      >
        <Sun className="w-4 h-4 text-amber-500" />
        <span className="hidden sm:inline">Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
          theme === 'dark' 
            ? 'bg-slate-900 text-emerald-400 shadow-sm font-extrabold border border-slate-700' 
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
        title="Dark Theme"
      >
        <Moon className="w-4 h-4 text-purple-400" />
        <span className="hidden sm:inline">Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
          theme === 'system' 
            ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold' 
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
        title="System Auto Theme"
      >
        <Laptop className="w-4 h-4 text-blue-500" />
        <span className="hidden sm:inline">Auto</span>
      </button>
    </div>
  );
}
