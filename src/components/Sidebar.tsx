'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, PlusCircle, Printer, BarChart3, Upload, Download, Key, ShieldAlert, LogOut, ChevronLeft, ChevronRight, X
} from 'lucide-react';

interface SidebarProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  currentEncoder: string;
  userRole: string;
  userAvatar: string;
  isAdmin: boolean;
  onOpenAddModal: () => void;
  onPrintSheet: () => void;
  onOpenAnalytics: () => void;
  onImportExcelCsv: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportExcel: () => void;
  onOpenPasswordModal: () => void;
  onOpenAvatarModal: () => void;
  onLogout: () => void;
}

export function Sidebar({
  isExpanded = false,
  onToggleExpand,
  mobileOpen = false,
  onCloseMobile,
  currentEncoder,
  userRole,
  userAvatar,
  isAdmin,
  onOpenAddModal,
  onPrintSheet,
  onOpenAnalytics,
  onImportExcelCsv,
  onExportExcel,
  onOpenPasswordModal,
  onOpenAvatarModal,
  onLogout
}: SidebarProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const activeExpanded = onToggleExpand ? isExpanded : internalExpanded;
  const handleToggle = onToggleExpand || (() => setInternalExpanded(!internalExpanded));

  const renderContent = (expanded: boolean, isMobile: boolean = false) => (
    <>
      {/* Top Header & Brand */}
      <div className="p-3.5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              onClick={!isMobile ? handleToggle : undefined}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-lg flex-shrink-0 flex items-center justify-center mx-auto md:mx-0 cursor-pointer group hover:scale-105 transition"
              title="Hospital Brand"
            >
              <img
                src="/hospital-logo.png"
                alt="Hospital Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            {expanded && (
              <div className="animate-fade-in whitespace-nowrap">
                <h1 className="font-extrabold text-sm text-white tracking-tight leading-none">
                  PhilHealth
                </h1>
                <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                  Logbook Pro
                </p>
              </div>
            )}
          </div>
          {isMobile && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Menu Items */}
        <nav className="space-y-1.5">
          
          {/* Dashboard Item */}
          <button
            onClick={() => { if (isMobile && onCloseMobile) onCloseMobile(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner group"
            title="Dashboard Overview"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0 text-emerald-400 group-hover:scale-110 transition" />
            {expanded && <span className="truncate">Dashboard</span>}
          </button>

          {/* Add Entry Action Button */}
          <button
            onClick={() => { onOpenAddModal(); if (isMobile && onCloseMobile) onCloseMobile(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 group cursor-pointer"
            title="Add New Patient Logbook Entry"
          >
            <PlusCircle className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition" />
            {expanded && <span className="truncate">Add Patient Entry</span>}
          </button>

          <div className="pt-2 border-t border-slate-800/60 my-2"></div>

          {/* Print Endorsement Sheet */}
          <button
            onClick={() => { onPrintSheet(); if (isMobile && onCloseMobile) onCloseMobile(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white group"
            title="Print Official Endorsement Sheet"
          >
            <Printer className="w-5 h-5 flex-shrink-0 text-indigo-400 group-hover:scale-110 transition" />
            {expanded && <span className="truncate">Print Sheet</span>}
          </button>

          {/* Analytics & Summary */}
          <button
            onClick={() => { onOpenAnalytics(); if (isMobile && onCloseMobile) onCloseMobile(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white group"
            title="View Analytics & Monthly Claims Charts"
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0 text-purple-400 group-hover:scale-110 transition" />
            {expanded && <span className="truncate">Analytics Summary</span>}
          </button>

          {/* Upload Excel / CSV */}
          <label
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer group"
            title="Upload Excel or CSV Patient File"
          >
            <Upload className="w-5 h-5 flex-shrink-0 text-blue-400 group-hover:scale-110 transition" />
            {expanded && <span className="truncate">Upload Excel/CSV</span>}
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => { onImportExcelCsv(e); if (isMobile && onCloseMobile) onCloseMobile(); }}
              className="hidden"
            />
          </label>

          {/* Export Excel */}
          <button
            onClick={() => { onExportExcel(); if (isMobile && onCloseMobile) onCloseMobile(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white group"
            title="Export Excel (.xlsx)"
          >
            <Download className="w-5 h-5 flex-shrink-0 text-emerald-400 group-hover:scale-110 transition" />
            {expanded && <span className="truncate">Export Excel</span>}
          </button>

          {/* Change Password */}
          <button
            onClick={() => { onOpenPasswordModal(); if (isMobile && onCloseMobile) onCloseMobile(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white group"
            title="Change Account Password"
          >
            <Key className="w-5 h-5 flex-shrink-0 text-amber-400 group-hover:scale-110 transition" />
            {expanded && <span className="truncate">Change Password</span>}
          </button>

          {/* Admin Settings (Admin Only) */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => { if (isMobile && onCloseMobile) onCloseMobile(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition font-bold text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white group"
              title="Admin Portal Settings"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 group-hover:scale-110 transition" />
              {expanded && <span className="truncate">Admin Portal</span>}
            </Link>
          )}

        </nav>
      </div>

      {/* Bottom User Info & Profile Avatar */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
        
        {/* User Profile Avatar Card */}
        <button
          onClick={() => { onOpenAvatarModal(); if (isMobile && onCloseMobile) onCloseMobile(); }}
          className={`w-full flex items-center gap-3 p-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition text-left group ${
            expanded ? 'justify-start' : 'justify-center'
          }`}
          title="Click to change profile picture"
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={currentEncoder}
              className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500 shadow-md group-hover:scale-105 transition flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md group-hover:scale-105 transition flex-shrink-0">
              {currentEncoder ? currentEncoder.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          {expanded && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="font-extrabold text-xs text-white truncate">
                {currentEncoder}
              </p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wider inline-block">
                {userRole}
              </span>
            </div>
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={() => { onLogout(); if (isMobile && onCloseMobile) onCloseMobile(); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition ${
            expanded ? 'justify-start' : 'justify-center'
          }`}
          title="Logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {expanded && <span>Logout</span>}
        </button>

      </div>
    </>
  );

  return (
    <>
      {/* Mobile Slide-Over Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          />
          <aside className="relative z-50 w-72 h-screen bg-slate-900 text-white flex flex-col justify-between shadow-2xl border-r border-slate-800 animate-scale-up">
            {renderContent(true, true)}
          </aside>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/80 text-white transition-all duration-300 ease-in-out flex flex-col justify-between shadow-2xl no-print hidden md:flex ${
          activeExpanded ? 'w-64' : 'w-20'
        }`}
      >
        {/* Floating Toggle Expand / Collapse Button on Sidebar Border */}
        <button
          onClick={handleToggle}
          className="absolute -right-3 top-6 z-50 p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-full transition-all shadow-lg border border-slate-700 flex items-center justify-center cursor-pointer transform hover:scale-110"
          title={activeExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {activeExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {renderContent(activeExpanded, false)}
      </aside>
    </>
  );
}
