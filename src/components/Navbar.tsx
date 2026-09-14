'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { BookOpen, LogOut, User, Download, Upload, FileText, Cloud, HardDrive, ShieldAlert, Menu, X, Key, Eye, EyeOff, Lock, CheckCircle, Printer, BarChart3, Database, Camera, Check, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface NavbarProps {
  userEmail?: string;
  onExportExcel?: () => void;
  onImportExcelCsv?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadCsvTemplate?: () => void;
  onPrintSheet?: () => void;
  onOpenAnalytics?: () => void;
  onBackupSystem?: () => void;
}

export function Navbar({ 
  userEmail, 
  onExportExcel, 
  onImportExcelCsv, 
  onDownloadCsvTemplate,
  onPrintSheet,
  onOpenAnalytics,
  onBackupSystem
}: NavbarProps) {
  const router = useRouter();
  const hasCloud = isSupabaseConfigured();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [encoderName, setEncoderName] = useState('Encoder');
  const [userRole, setUserRole] = useState('ENCODER');
  const [userAvatar, setUserAvatar] = useState('');

  React.useEffect(() => {
    const encoder = localStorage.getItem('philhealth_encoder') || 'Encoder';
    const role = localStorage.getItem('philhealth_user_role') || 'ENCODER';
    const avatar = localStorage.getItem(`philhealth_avatar_${encoder.toLowerCase()}`) || '';
    setEncoderName(encoder);
    setUserRole(role);
    setUserAvatar(avatar);
    const isAdm = role === 'ADMIN' || encoder.toLowerCase().includes('admin');
    setIsAdmin(isAdm);
  }, []);

  const handleSaveAvatar = (newAvatarUrl: string) => {
    setUserAvatar(newAvatarUrl);
    if (encoderName) {
      localStorage.setItem(`philhealth_avatar_${encoderName.toLowerCase()}`, newAvatarUrl);
    }
  };

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
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80 transition-colors shadow-sm no-print">
        <div className="max-w-[98%] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex-shrink-0 bg-white dark:bg-slate-800 p-0.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition transform flex items-center justify-center">
              <img
                src="/hospital-logo.png"
                alt="Cebu Provincial Hospital Balamban Logo"
                className="w-full h-full object-contain rounded-full"
              />
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
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden md:block">
                Cebu Provincial Hospital - Balamban
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

            {/* User Profile Avatar Badge & Customizer */}
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition group cursor-pointer"
              title="Click to view & change your User Profile Picture / Avatar"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={encoderName}
                  className="w-7 h-7 rounded-full object-cover border-2 border-emerald-500 shadow-xs group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                  {encoderName ? encoderName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 hidden lg:inline-block">
                {encoderName}
              </span>
            </button>

            {/* Print Endorsement Sheet */}
            {onPrintSheet && (
              <button
                onClick={onPrintSheet}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                title="Print Official Daily Endorsement Sheet"
              >
                <Printer className="w-4 h-4 text-indigo-500" />
                <span>Print Sheet</span>
              </button>
            )}

            {/* Analytics Dashboard */}
            {onOpenAnalytics && (
              <button
                onClick={onOpenAnalytics}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                title="View Analytics & Monthly Claims Charts"
              >
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <span>Analytics</span>
              </button>
            )}

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
              onClick={() => { setShowAvatarModal(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <Camera className="w-4 h-4 text-emerald-500" />
              <span>Change Profile Picture</span>
            </button>

            <button
              onClick={() => { setShowPasswordModal(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Change Password</span>
            </button>

            {onPrintSheet && (
              <button
                onClick={() => { onPrintSheet(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                <Printer className="w-4 h-4 text-indigo-500" />
                <span>Print Endorsement Sheet</span>
              </button>
            )}

            {onOpenAnalytics && (
              <button
                onClick={() => { onOpenAnalytics(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full p-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <span>Analytics & Charts</span>
              </button>
            )}

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

      {/* User Profile Avatar Customizer Modal */}
      <ProfileAvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentEncoder={encoderName}
        currentAvatar={userAvatar}
        onSaveAvatar={handleSaveAvatar}
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

    const userEmail = typeof window !== 'undefined' ? localStorage.getItem('philhealth_user_email') || '' : '';
    const passMap = JSON.parse(localStorage.getItem('philhealth_user_passwords') || '{}');
    if (currentEncoder) passMap[currentEncoder.toLowerCase()] = newPassword;
    if (userEmail) passMap[userEmail.toLowerCase()] = newPassword;
    localStorage.setItem('philhealth_user_passwords', JSON.stringify(passMap));

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

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80', // Female Doctor
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80', // Male Doctor
  'https://images.unsplash.com/photo-1594824813571-28a778853914?w=150&auto=format&fit=crop&q=80', // Female Nurse
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80', // Medical Staff Male
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80', // Healthcare Admin
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', // Executive Female
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80', // Executive Male
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=150&auto=format&fit=crop&q=80', // Hospital Admin
];

function ProfileAvatarModal({
  isOpen,
  onClose,
  currentEncoder,
  currentAvatar,
  onSaveAvatar,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentEncoder: string;
  currentAvatar: string;
  onSaveAvatar: (newAvatarUrl: string) => void;
}) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || '');
  const [previewAvatar, setPreviewAvatar] = useState(currentAvatar || '');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large! Please choose an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        setPreviewAvatar(base64);
        setSelectedAvatar(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSaveAvatar(selectedAvatar);
    onClose();
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatar('');
    setPreviewAvatar('');
    onSaveAvatar('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in animate-modal-backdrop no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative animate-scale-up">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="relative inline-block">
            {previewAvatar ? (
              <img
                src={previewAvatar}
                alt={currentEncoder}
                className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl mx-auto"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-xl mx-auto border-4 border-emerald-400/40">
                {currentEncoder ? currentEncoder.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            
            <label
              htmlFor="avatar-upload-input-circle"
              className="absolute bottom-0 right-0 p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg cursor-pointer transition transform hover:scale-110"
              title="Upload Custom Photo"
            >
              <Camera className="w-4 h-4" />
              <input
                id="avatar-upload-input-circle"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white pt-1">
            User Profile Picture
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Account: <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentEncoder}</span>
          </p>
        </div>

        {/* Upload Custom Photo Action */}
        <div className="space-y-3">
          <label
            htmlFor="avatar-upload-input-btn"
            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>Upload Photo from Computer</span>
            <input
              id="avatar-upload-input-btn"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Preset Avatars Grid */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Or Choose Preset Staff Avatar:
            </span>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(url);
                    setPreviewAvatar(url);
                  }}
                  className={`relative rounded-full overflow-hidden border-2 transition transform hover:scale-105 ${
                    selectedAvatar === url
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-105'
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-12 h-12 object-cover" />
                  {selectedAvatar === url && (
                    <div className="absolute inset-0 bg-emerald-600/40 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white font-bold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          {previewAvatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition border border-rose-200 dark:border-rose-800"
              title="Remove Picture"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
}
