'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FluidSimulation } from '@/components/FluidSimulation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const activeUser = username.trim();
    const enteredPass = password.trim();

    if (!activeUser || !enteredPass) {
      setErrorMsg('Please enter both your Username and Password.');
      return;
    }

    setLoading(true);

    const generatedEmail = activeUser.toLowerCase().includes('@')
      ? activeUser.toLowerCase()
      : activeUser.toLowerCase().replace(/[^a-z0-9]/g, '') + '@hospital.com';

    // 1. Fetch Registered Accounts list
    const defaultAccounts = [
      { name: 'System Admin', email: 'admin@hospital.com', role: 'ADMIN' },
      { name: 'Juvy', email: 'juvy@hospital.com', role: 'ENCODER' },
      { name: 'Miko', email: 'miko@hospital.com', role: 'ENCODER' }
    ];

    let userAccounts: any[] = [];
    try {
      userAccounts = JSON.parse(localStorage.getItem('philhealth_accounts') || '[]');
    } catch (e) {}

    const allRegistered = [...defaultAccounts, ...userAccounts];

    // Check if account exists
    const registeredUser = allRegistered.find(a => 
      a && (
        (a.name && a.name.trim().toLowerCase() === activeUser.toLowerCase()) ||
        (a.email && a.email.trim().toLowerCase() === generatedEmail.toLowerCase())
      )
    );

    if (!registeredUser) {
      setLoading(false);
      setErrorMsg(`❌ Access Denied: Account "${activeUser}" is not registered. Please ask the Admin to create your account first.`);
      return;
    }

    const officialName = registeredUser.name || activeUser;
    const officialEmail = registeredUser.email || generatedEmail;
    const officialRole = registeredUser.role || (officialName.toLowerCase().includes('admin') ? 'ADMIN' : 'ENCODER');

    // 2. Password Verification
    const passMap = JSON.parse(localStorage.getItem('philhealth_user_passwords') || '{}');
    const storedPass = passMap[officialName.toLowerCase()] || passMap[officialEmail.toLowerCase()] || passMap[activeUser.toLowerCase()];

    if (storedPass) {
      if (storedPass !== enteredPass) {
        setLoading(false);
        setErrorMsg(`❌ Incorrect password for account "${officialName}".`);
        return;
      }
    } else {
      // Default password fallback for initial default staff accounts if not changed yet
      const defaultPass = officialRole === 'ADMIN' ? 'admin123' : '123456';
      if (enteredPass !== defaultPass && enteredPass !== '123456' && enteredPass !== 'admin123') {
        setLoading(false);
        setErrorMsg(`❌ Incorrect password for account "${officialName}".`);
        return;
      }
      // Store verified initial password
      passMap[officialName.toLowerCase()] = enteredPass;
      passMap[officialEmail.toLowerCase()] = enteredPass;
      localStorage.setItem('philhealth_user_passwords', JSON.stringify(passMap));
    }

    // 3. Supabase Sign In (if configured)
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signInWithPassword({
          email: officialEmail,
          password: enteredPass,
        });
      } catch (err) {}
    }

    // 4. Save Valid Session Credentials & Redirect
    localStorage.setItem('philhealth_encoder', officialName);
    localStorage.setItem('philhealth_user_email', officialEmail);
    localStorage.setItem('philhealth_user_role', officialRole);

    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 bg-slate-50/70 dark:bg-slate-950/70 transition-colors relative overflow-hidden backdrop-blur-[2px]">
      <FluidSimulation />
      
      {/* Background Hospital Logo Watermark Wrap */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        <img
          src="/hospital-logo.png"
          alt="Cebu Provincial Hospital Balamban Watermark"
          className="w-[500px] sm:w-[650px] md:w-[750px] max-w-[90vw] opacity-[0.05] dark:opacity-[0.07] filter contrast-125 saturate-150 blur-[0.5px] scale-105 pointer-events-none"
        />
      </div>

      {/* Top Header */}
      <div className="flex justify-between items-center w-full max-w-[98%] mx-auto px-2 relative z-10">
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 bg-white dark:bg-slate-800 p-0.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <img
              src="/hospital-logo.png"
              alt="Cebu Provincial Hospital Balamban Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
            Cebu Provincial Hospital - Balamban
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* Main Login Card - Animated Spring Entrance */}
      <div className="max-w-md w-full mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 my-auto relative z-10 animate-scale-up transform transition-all duration-300 hover:shadow-emerald-500/10">
        
        <div className="text-center space-y-2">
          <div className="inline-flex p-2 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 mb-1 transition-transform duration-300 hover:scale-105">
            <img
              src="/hospital-logo.png"
              alt="Cebu Provincial Hospital Balamban Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain animate-float"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Encoder Portal Login
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">
            PhilHealth Logbook Pro • Hospital Endorsement
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Admin, Juvy, Miko"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Password Field with Eye Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 text-sm md:text-base mt-2"
          >
            {loading ? 'Verifying Password...' : 'Sign In'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3">
        PhilHealth Logbook Pro • Hospital Endorsement Management
      </footer>

    </div>
  );
}
