'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Laptop, Palette, Check } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [activeColor, setActiveColor] = useState('emerald');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedColor = localStorage.getItem('philhealth_color_theme') || 'emerald';
    setActiveColor(savedColor);
    applyColorTheme(savedColor);
  }, []);

  const applyColorTheme = (color: string) => {
    setActiveColor(color);
    localStorage.setItem('philhealth_color_theme', color);
    document.documentElement.setAttribute('data-color-theme', color);
  };

  if (!mounted) return <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>;

  return (
    <div className="relative z-50 flex items-center gap-1.5">
      {/* Light / Dark / Auto Quick Switcher */}
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

      {/* Interactive Color Palette Selector Button */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-2 bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        title="Interactive Color Palette Studio"
      >
        <Palette className="w-4 h-4 text-emerald-500" />
      </button>

      {/* Palette Popover Menu */}
      {menuOpen && (
        <div className="absolute right-0 top-12 z-[100] w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2">
          <div className="text-[11px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
            Accent Theme Studio
          </div>

          <div className="space-y-1">
            {[
              { id: 'emerald', label: 'Emerald Hospital 🌿', color: 'bg-emerald-500' },
              { id: 'blue', label: 'Ocean Blue 💙', color: 'bg-blue-600' },
              { id: 'purple', label: 'Royal Purple 💜', color: 'bg-purple-600' },
              { id: 'rose', label: 'Rose Medical 🌸', color: 'bg-rose-600' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { applyColorTheme(item.id); setMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeColor === item.id 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                  <span>{item.label}</span>
                </div>
                {activeColor === item.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
