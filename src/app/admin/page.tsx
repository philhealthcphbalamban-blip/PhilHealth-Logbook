'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { UserPlus, ShieldAlert, CheckCircle, Trash2, Key, User, Mail, ArrowLeft, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ENCODER';
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'ENCODER'>('ENCODER');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('philhealth_user_email') || 'admin@hospital.com';
    setCurrentUserEmail(savedEmail);
    loadUsers();
  }, []);

  const loadUsers = () => {
    const localUsers = localStorage.getItem('philhealth_accounts');
    if (localUsers) {
      try {
        setUsers(JSON.parse(localUsers));
      } catch (e) {
        initDefaultUsers();
      }
    } else {
      initDefaultUsers();
    }
  };

  const initDefaultUsers = () => {
    const defaults: UserAccount[] = [
      { id: '1', name: 'System Admin', email: 'admin@hospital.com', role: 'ADMIN', createdAt: new Date().toLocaleDateString() },
      { id: '2', name: 'Juvy (Encoder)', email: 'juvy@hospital.com', role: 'ENCODER', createdAt: new Date().toLocaleDateString() },
      { id: '3', name: 'Miko (Encoder)', email: 'miko@hospital.com', role: 'ENCODER', createdAt: new Date().toLocaleDateString() }
    ];
    setUsers(defaults);
    localStorage.setItem('philhealth_accounts', JSON.stringify(defaults));
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');

    if (!email || !name || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const { error: sbErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { encoder_name: name, role: role }
          }
        });
        if (sbErr) throw sbErr;
      } catch (err: any) {
        // Continue saving locally
      }
    }

    const newUser: UserAccount = {
      id: String(Date.now()),
      name,
      email,
      role,
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem('philhealth_accounts', JSON.stringify(updated));

    setMsg(`Account for ${name} (${email}) created successfully!`);
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to remove this user account?')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      localStorage.setItem('philhealth_accounts', JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 transition-colors">
      <Navbar userEmail={currentUserEmail} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                Admin Settings & User Creation
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Directly create and manage encoder accounts for hospital staff
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Account Creation Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              <span>Create New Staff User</span>
            </h2>

            {msg && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{msg}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Full Name / Encoder Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="santos@hospital.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Initial Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Access Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ENCODER">ENCODER (Data Entry Only)</option>
                  <option value="ADMIN">ADMIN (Full Control + User Creation)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User Account</span>
              </button>

            </form>
          </div>

          {/* Registered Accounts List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden p-5 md:p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <span>Registered User Accounts ({users.length})</span>
            </h2>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl font-bold text-xs ${
                      u.role === 'ADMIN' 
                        ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300' 
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {u.role}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-xl transition"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
