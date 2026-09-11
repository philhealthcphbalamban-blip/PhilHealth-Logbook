'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { REF_MEMBERSHIPS, REF_ICD_MAP } from '@/lib/refData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Users, Calendar, Plus, Trash2, Sparkles, FolderOpen, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RecordItem {
  id: string;
  category: string;
  patientName: string;
  phicCat: string;
  icd: string;
  amount: number | null;
  hci?: number | null;
  pf?: number | null;
  encoderName?: string;
}

const deduplicateRecords = (items: RecordItem[]): RecordItem[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${(item.patientName || '').trim().toUpperCase()}||${(item.category || '').trim().toUpperCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState('');
  const [pastDates, setPastDates] = useState<string[]>([]);
  const [encoder, setEncoder] = useState('Juvy');
  const [userEmail, setUserEmail] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [dupError, setDupError] = useState('');

  // Form State (Amount input removed as requested)
  const [category, setCategory] = useState('ADMISSION');
  const [patientName, setPatientName] = useState('');
  const [phicCat, setPhicCat] = useState('PR-M');
  const [icd, setIcd] = useState('');
  const [hci, setHci] = useState('');
  const [pf, setPf] = useState('');

  const [selectedIsoDate, setSelectedIsoDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const todayObj = new Date();
    const todayStr = todayObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    setCurrentDate(todayStr);

    const savedEncoder = localStorage.getItem('philhealth_encoder') || 'Juvy';
    const savedEmail = localStorage.getItem('philhealth_user_email') || '';
    setEncoder(savedEncoder);
    setUserEmail(savedEmail);

    fetchPastWorksheets();
    loadSavedRecords(todayStr);
  }, []);

  const handleDatePickerChange = (isoVal: string) => {
    if (!isoVal) return;
    setSelectedIsoDate(isoVal);

    const parts = isoVal.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const formattedKey = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
      setCurrentDate(formattedKey);
      loadSavedRecords(formattedKey);
    }
  };

  // Fetch past worksheet dates from Supabase / LocalStorage
  const fetchPastWorksheets = async () => {
    let datesSet = new Set<string>();

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('records').select('date_key');
        if (data) {
          data.forEach(r => {
            if (r.date_key) datesSet.add(r.date_key);
          });
        }
      } catch (e) {}
    }

    // Check localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('philhealth_recs_')) {
        datesSet.add(key.replace('philhealth_recs_', ''));
      }
    }

    // Always include sample date sheets if empty
    if (datesSet.size === 0) {
      datesSet.add('SEPTEMBER 11, 2026');
      datesSet.add('AUGUST 15, 2026');
      datesSet.add('01012025');
    }

    setPastDates(Array.from(datesSet));
  };

  const loadSavedRecords = async (dateKey: string) => {
    // 1. Instant local-first rendering (0ms delay) with deduplication
    const localData = localStorage.getItem(`philhealth_recs_${dateKey}`);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setRecords(deduplicateRecords(parsed));
      } catch (e) {
        setRecords([]);
      }
    } else {
      setRecords([]);
    }

    // 2. Non-blocking cloud sync in background
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('records')
          .select('*')
          .eq('date_key', dateKey);

        if (data && data.length > 0) {
          const cloudRecords = data.map(r => ({
            id: r.id,
            category: r.category,
            patientName: r.patient_name,
            phicCat: r.phic_cat,
            icd: r.icd_code,
            amount: r.amount,
            hci: r.hci_amount,
            pf: r.pf_amount,
            encoderName: r.encoder_name || encoder || 'System'
          }));
          const cleanCloud = deduplicateRecords(cloudRecords);
          setRecords(cleanCloud);
          localStorage.setItem(`philhealth_recs_${dateKey}`, JSON.stringify(cleanCloud));
        }
      } catch (e) {}
    }
  };

  const handleDateSwitch = (newDate: string) => {
    setCurrentDate(newDate);
    loadSavedRecords(newDate);
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setDupError('');
    if (!patientName.trim()) return;

    const cleanPatient = patientName.trim().toUpperCase();
    const cleanCategory = category.trim().toUpperCase();

    // Check for Duplicate Patient Entry under same section
    const isDuplicate = records.some(r => 
      r.patientName.trim().toUpperCase() === cleanPatient && 
      r.category.trim().toUpperCase() === cleanCategory
    );

    if (isDuplicate) {
      setDupError(`Duplicate Entry Blocked: "${cleanPatient}" already exists under ${cleanCategory}.`);
      return;
    }

    // Auto calculate amount from ICD map if present
    const cleanIcd = icd.trim().toUpperCase();
    const autoAmount = REF_ICD_MAP[cleanIcd] !== undefined ? REF_ICD_MAP[cleanIcd] : null;

    const newRec: RecordItem = {
      id: String(Date.now()),
      category: cleanCategory,
      patientName: cleanPatient,
      phicCat: phicCat.trim().toUpperCase(),
      icd: cleanIcd,
      amount: autoAmount,
      hci: hci !== '' ? parseFloat(hci) : null,
      pf: pf !== '' ? parseFloat(pf) : null,
      encoderName: encoder || 'System'
    };

    const updated = deduplicateRecords([...records, newRec]);
    setRecords(updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('records').insert({
          date_key: currentDate,
          category: newRec.category,
          patient_name: newRec.patientName,
          phic_cat: newRec.phicCat,
          icd_code: newRec.icd,
          amount: newRec.amount,
          hci_amount: newRec.hci,
          pf_amount: newRec.pf,
          encoder_name: newRec.encoderName
        });
      } catch (e) {}
    }

    localStorage.setItem(`philhealth_recs_${currentDate}`, JSON.stringify(updated));
    fetchPastWorksheets();

    setPatientName('');
    setIcd('');
    setHci('');
    setPf('');
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('records').delete().eq('id', id);
      } catch (e) {}
    }
    localStorage.setItem(`philhealth_recs_${currentDate}`, JSON.stringify(updated));
  };

  const exportExcel = () => {
    const catMap: Record<string, number> = {
      'ADMISSION': 0,
      'MINOR (ER)': 5,
      'MINOR (OPD)': 10,
      'DENTAL': 15,
      'OECB': 20,
      'ANIMAL BITE': 25,
      'PAIN MANAGEMENT': 30
    };

    const wb = XLSX.utils.book_new();
    const grid: any[][] = [];
    for (let r = 0; r < 100; r++) grid.push(new Array(36).fill(null));

    grid[0][2] = 'Employee:';
    grid[0][3] = encoder;
    grid[0][10] = 'OUTPATIENT';

    grid[1][0] = 'ADMISSION';
    grid[1][5] = 'MINOR (ER)';
    grid[1][10] = 'MINOR (OPD)';
    grid[1][15] = 'DENTAL';
    grid[1][20] = 'OECB';
    grid[1][25] = 'ANIMAL BITE';
    grid[1][30] = 'PAIN MANAGEMENT';

    grid[2][0] = '#'; grid[2][1] = 'Patient Name'; grid[2][2] = 'Cat'; grid[2][3] = 'ICD/RVS'; grid[2][4] = 'Encoder';
    grid[2][5] = '#'; grid[2][6] = 'Patient Name'; grid[2][7] = 'Cat'; grid[2][8] = 'ICD/RVS'; grid[2][9] = 'Encoder';
    grid[2][10] = '#'; grid[2][11] = 'Patient Name'; grid[2][12] = 'Cat'; grid[2][13] = 'ICD/RVS'; grid[2][14] = 'Encoder';
    grid[2][15] = '#'; grid[2][16] = 'Patient Name'; grid[2][17] = 'Cat'; grid[2][18] = 'ICD/RVS'; grid[2][19] = 'Encoder';
    grid[2][20] = '#'; grid[2][21] = 'Patient Name'; grid[2][22] = 'Cat'; grid[2][23] = 'ICD/RVS'; grid[2][24] = 'Encoder';
    grid[2][25] = '#'; grid[2][26] = 'Patient Name'; grid[2][27] = 'Cat'; grid[2][28] = 'ICD/RVS'; grid[2][29] = 'Encoder';
    grid[2][30] = '#'; grid[2][31] = 'Patient Name'; grid[2][32] = 'Cat'; grid[2][33] = 'ICD/RVS'; grid[2][34] = 'Encoder';

    const counters: Record<string, number> = {};
    Object.keys(catMap).forEach(c => counters[c] = 0);

    records.forEach(rec => {
      const startCol = catMap[rec.category];
      if (startCol === undefined) return;
      const idx = counters[rec.category]++;
      const rowIdx = 3 + idx;

      grid[rowIdx][startCol] = idx + 1;
      grid[rowIdx][startCol + 1] = rec.patientName;
      grid[rowIdx][startCol + 2] = rec.phicCat;
      grid[rowIdx][startCol + 3] = rec.icd;
      grid[rowIdx][startCol + 4] = rec.encoderName || encoder;
    });

    const ws = XLSX.utils.aoa_to_sheet(grid);
    XLSX.utils.book_append_sheet(wb, ws, currentDate.substring(0, 31));
    XLSX.writeFile(wb, `PhilHealth_${currentDate.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const filteredRecords = activeFilter === 'ALL' 
    ? records 
    : records.filter(r => r.category === activeFilter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 transition-colors relative overflow-hidden">
      
      {/* Background Ambient Parallax Floating Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none animate-float"></div>
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none animate-float-reverse"></div>
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none animate-glow"></div>

      <Navbar userEmail={userEmail} onExportExcel={exportExcel} />

      <main className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-4 md:pt-6 space-y-4 md:space-y-6 relative z-10">

        {/* Current & Past Worksheet Header with Parallax Glassmorphic Card */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 parallax-card">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 md:p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl md:rounded-2xl shadow-sm">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-slate-400 block">Worksheet Date</span>
                <input
                  type="text"
                  value={currentDate}
                  onChange={(e) => handleDateSwitch(e.target.value.toUpperCase())}
                  className="block text-lg md:text-xl font-extrabold bg-transparent text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Native Date Picker Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 sm:pl-3">
              <Calendar className="w-4 h-4 text-emerald-500 hidden sm:block" />
              <input
                type="date"
                value={selectedIsoDate}
                onChange={(e) => handleDatePickerChange(e.target.value)}
                className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-inner"
              />
              <button
                type="button"
                onClick={() => handleDatePickerChange(new Date().toISOString().split('T')[0])}
                className="px-2.5 py-1.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs"
                title="Jump to Today"
              >
                Today
              </button>
            </div>
          </div>

          {/* Encoder Name Info */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">Encoder</span>
              <input
                type="text"
                value={encoder}
                onChange={(e) => setEncoder(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <button
              onClick={fetchPastWorksheets}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
              title="Refresh Dates"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile & Desktop Parallax Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
          
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm flex items-center justify-between parallax-card">
            <div>
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Total Patients</p>
              <h3 className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{records.length}</h3>
            </div>
            <div className="p-2.5 md:p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl md:rounded-2xl shadow-sm">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm flex items-center justify-between parallax-card">
            <div>
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-400">Active Categories</p>
              <h3 className="text-2xl md:text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {new Set(records.map(r => r.category)).size}
              </h3>
            </div>
            <div className="p-2.5 md:p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl md:rounded-2xl shadow-sm">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>

        </div>

        {/* Main Grid: Data Entry & Table View (Responsive Mobile/Tablet/Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

          {/* Logbook Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm space-y-4">
            <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Plus className="w-5 h-5 text-emerald-500" />
              <span>Add Logbook Entry</span>
            </h2>

            {dupError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold">
                ⚠️ {dupError}
              </div>
            )}

            <form onSubmit={handleAddRecord} className="space-y-3 md:space-y-4">
              
              <div>
                <label className="block text-[11px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Section Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ADMISSION">ADMISSION</option>
                  <option value="MINOR (ER)">MINOR (ER)</option>
                  <option value="MINOR (OPD)">MINOR (OPD)</option>
                  <option value="DENTAL">DENTAL</option>
                  <option value="OECB">OECB</option>
                  <option value="ANIMAL BITE">ANIMAL BITE</option>
                  <option value="PAIN MANAGEMENT">PAIN MANAGEMENT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Patient Name (LAST, FIRST MIDDLE)
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. DELA CRUZ, JUAN"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  PHIC Membership (Cat)
                </label>
                <input
                  type="text"
                  list="membershipList"
                  required
                  value={phicCat}
                  onChange={(e) => setPhicCat(e.target.value)}
                  placeholder="e.g. PR-M, SC-M, POS-FI-D"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <datalist id="membershipList">
                  {REF_MEMBERSHIPS.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] md:text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  ICD10 / RVS Code
                </label>
                <input
                  type="text"
                  list="icdList"
                  value={icd}
                  onChange={(e) => setIcd(e.target.value)}
                  placeholder="e.g. 59513, NSD01, A09.9"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                {/* Clean ICD Datalist without peso signs */}
                <datalist id="icdList">
                  {Object.keys(REF_ICD_MAP).map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </datalist>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 md:py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs md:text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Save Entry</span>
              </button>

            </form>
          </div>

          {/* Logbook Data View */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['ALL', 'ADMISSION', 'MINOR (ER)', 'MINOR (OPD)', 'DENTAL', 'OECB', 'ANIMAL BITE', 'PAIN MANAGEMENT'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    activeFilter === cat 
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Desktop Table View & Mobile Card View */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden">
              
              {/* Responsive Table */}
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 md:p-3.5">#</th>
                      <th className="p-3 md:p-3.5">Category</th>
                      <th className="p-3 md:p-3.5">Patient Name</th>
                      <th className="p-3 md:p-3.5">Cat</th>
                      <th className="p-3 md:p-3.5">ICD10 / RVS</th>
                      <th className="p-3 md:p-3.5">Encoder</th>
                      <th className="p-3 md:p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-200">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          No logbook entries found for category: {activeFilter}
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-3 md:p-3.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 md:p-3.5 font-bold text-emerald-600 dark:text-emerald-400">{r.category}</td>
                          <td className="p-3 md:p-3.5 font-semibold text-slate-900 dark:text-white">{r.patientName}</td>
                          <td className="p-3 md:p-3.5 font-mono text-amber-600 dark:text-amber-400">{r.phicCat}</td>
                          <td className="p-3 md:p-3.5 font-mono text-blue-600 dark:text-blue-400">{r.icd || '-'}</td>
                          <td className="p-3 md:p-3.5 font-semibold">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] border border-slate-200 dark:border-slate-700">
                              👤 {r.encoderName || encoder || 'System'}
                            </span>
                          </td>
                          <td className="p-3 md:p-3.5 text-right">
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
