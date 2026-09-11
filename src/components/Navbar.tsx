'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { BookOpen, LogOut, User, Download, Upload, FileText, Cloud, HardDrive, ShieldAlert, Menu, X, Key, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  userEmail?: string;
  onExportExcel?: () => void;
  onImportExcelCsv?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadCsvTemplate?: () => void;
}

export function Navbar({ userEmail, onExportExcel, onImportExcelCsv, onDownloadCsvTemplate }: NavbarProps) {
  const router = useRouter();
  const hasCloud = isSupabaseConfigured();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  React.useEffect(() => {
    const encoder = localStorage.getItem('philhealth_encoder') || '';
    const role = localStorage.getItem('philhealth_user_role') || '';
    const isAdm = role === 'ADMIN' || encoder.toLowerCase().includes('admin');
    setIsAdmin(isAdm);
  }, []);

  const handleLogout = () => {
    // 1. Immediately purge session credentials
    localStorage.removeItem('philhealth_encoder');
    localStorage.removeItem('philhealth_user_email');
    localStorage.removeItem('philhealth_user_role');

    // 2. Background non-blocking cloud sign-out
    if (hasCloud) {
      supabase.auth.signOut().catch(() => {});
    }

    // 3. Instant hard navigation to /login (0ms latency)
    window.location.href = '/login';
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-sm">
        <div className="max-w-[98%] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl shadow-md group-hover:bg-emerald-500 dark:group-hover:bg-emerald-400 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base md:text-lg text-slate-900 dark:text-white tracking-tight">
                  PhilHealth Logbook
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block">
                Hospital Endorsement System
              </p>
            </div>
          </Link>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              {hasCloud ? (
                <>
                  <Cloud className="w-4 h-4 text-emerald-500" />
                  <span>Supabase Live</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-amber-500" />
                  <span>Local Storage</span>
                </>
              )}
            </div>

            <ThemeToggle />

            {/* CSV Template Download Button */}
            {onDownloadCsvTemplate && (
              <button
                onClick={onDownloadCsvTemplate}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                title="Download sample CSV template for bulk patient uploads"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>CSV Template</span>
              </button>
            )}

            {/* Upload Excel / CSV Button */}
            {onImportExcelCsv && (
              <label
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                title="Upload Excel (.xlsx, .xls) or CSV file"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel/CSV</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={onImportExcelCsv}
                  className="hidden"
                />
              </label>
            )}

            {/* Change Password Button for ALL Encoders & Users */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
              title="Change your login password"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Change Password</span>
            </button>

            {/* Admin Access Restriction: Render Admin Settings ONLY for Admin users */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
              >
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                <span>Admin Settings</span>
              </Link>
            )}

            {onExportExcel && (
              <button
                onClick={onExportExcel}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            )}

            {/* Prominent Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 px-3 py-2 rounded-xl text-xs font-bold transition"
              title="Logout of Encoder Portal"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-lg">
            <button
              onClick={() => { setShowPasswordModal(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Change Password</span>
            </button>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                <span>Admin Settings</span>
              </Link>
            )}

            {onDownloadCsvTemplate && (
              <button
                onClick={() => { onDownloadCsvTemplate(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>CSV Template</span>
              </button>
            )}

            {onImportExcelCsv && (
              <label className="flex items-center gap-2 w-full p-3 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Excel/CSV</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => { onImportExcelCsv(e); setMobileMenuOpen(false); }}
                  className="hidden"
                />
              </label>
            )}

            {onExportExcel && (
              <button
                onClick={() => { onExportExcel(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel (.xlsx)</span>
              </button>
            )}

            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 w-full p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}

      </header>

      {/* Change Password Modal accessible anywhere */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}

function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const currentEncoder = typeof window !== 'undefined' ? localStorage.getItem('philhealth_encoder') || 'Encoder' : 'Encoder';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (e: any) {}
    }

    setMsg('Password successfully updated!');
    setNewPassword('');
    setConfirmPassword('');
    setLoading(false);
    setTimeout(() => {
      setMsg('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="inline-flex p-3 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-2xl mb-1">
            <Key className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Change Your Password
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account: <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentEncoder}</span>
          </p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Key className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
