'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { REF_MEMBERSHIPS, REF_ICD_MAP } from '@/lib/refData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Users, Calendar, Plus, Trash2, Sparkles, FolderOpen, RefreshCw, Search, Printer, BarChart3, Database, X, CheckCircle, Pencil
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
  const [userRole, setUserRole] = useState('ENCODER');
  const [userEmail, setUserEmail] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [dupError, setDupError] = useState('');

  // New Features State
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const savedRole = localStorage.getItem('philhealth_user_role') || 'ENCODER';
    setEncoder(savedEncoder);
    setUserEmail(savedEmail);
    setUserRole(savedRole);

    fetchPastWorksheets();
    loadSavedRecords(todayStr);
  }, []);

  const isAdmin = userRole === 'ADMIN' || encoder.toLowerCase().includes('admin');

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

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .eq('date_key', dateKey)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const cloudRecords: RecordItem[] = data.map((d: any) => ({
            id: d.id || String(Date.now()),
            category: d.category,
            patientName: d.patient_name,
            phicCat: d.phic_cat,
            icd: d.icd_code,
            amount: d.amount,
            hci: d.hci_amount,
            pf: d.pf_amount,
            encoderName: d.encoder_name
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

  const handleStartEdit = (rec: RecordItem) => {
    setEditingId(rec.id);
    setCategory(rec.category);
    setPatientName(rec.patientName);
    setPhicCat(rec.phicCat);
    setIcd(rec.icd || '');
    setHci(rec.hci !== undefined && rec.hci !== null ? String(rec.hci) : '');
    setPf(rec.pf !== undefined && rec.pf !== null ? String(rec.pf) : '');
    setDupError('');
    setShowAddModal(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPatientName('');
    setIcd('');
    setHci('');
    setPf('');
    setDupError('');
    setShowAddModal(false);
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setDupError('');
    if (!patientName.trim()) return;

    const cleanPatient = patientName.trim().toUpperCase();
    const cleanCategory = category.trim().toUpperCase();
    const cleanIcd = icd.trim().toUpperCase();
    const autoAmount = REF_ICD_MAP[cleanIcd] !== undefined ? REF_ICD_MAP[cleanIcd] : null;

    if (editingId) {
      // Edit / Update existing record mode
      const updatedRecords = records.map(r => {
        if (r.id === editingId) {
          return {
            ...r,
            category: cleanCategory,
            patientName: cleanPatient,
            phicCat: phicCat.trim().toUpperCase(),
            icd: cleanIcd,
            amount: autoAmount,
            hci: hci !== '' ? parseFloat(hci) : null,
            pf: pf !== '' ? parseFloat(pf) : null,
            encoderName: r.encoderName || encoder || 'System'
          };
        }
        return r;
      });

      setRecords(updatedRecords);
      localStorage.setItem(`philhealth_recs_${currentDate}`, JSON.stringify(updatedRecords));

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('records').update({
            category: cleanCategory,
            patient_name: cleanPatient,
            phic_cat: phicCat.trim().toUpperCase(),
            icd_code: cleanIcd,
            hci_amount: hci !== '' ? parseFloat(hci) : null,
            pf_amount: pf !== '' ? parseFloat(pf) : null
          }).eq('id', editingId);
        } catch (e) {}
      }

      handleCancelEdit();
      return;
    }

    // New Entry Creation Mode: Check for Duplicate Patient Entry under same section
    const isDuplicate = records.some(r => 
      r.patientName.trim().toUpperCase() === cleanPatient && 
      r.category.trim().toUpperCase() === cleanCategory
    );

    if (isDuplicate) {
      setDupError(`Duplicate Entry Blocked: "${cleanPatient}" already exists under ${cleanCategory}.`);
      return;
    }

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
    if (!isAdmin) {
      alert('⚠️ Access Denied: Only ADMIN users have permission to delete patient records.');
      return;
    }

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

  // Download Sample CSV Template
  const downloadCsvTemplate = () => {
    const headers = ['Category', 'Patient Name', 'Phic Cat', 'ICD10 Code', 'Encoder'];
    const sampleRows = [
      ['ADMISSION', 'JUAN DELA CRUZ', 'PR-M', '59513', encoder || 'System'],
      ['MINOR (ER)', 'MARIA SANTOS', 'PR-S', 'NSD01', encoder || 'System'],
      ['DENTAL', 'PEDRO PENDUKO', 'NPR', 'A09.9', encoder || 'System']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'philhealth_logbook_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Excel (.xlsx, .xls) and CSV file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) return;

        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        
        const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rawData || rawData.length === 0) {
          alert('The uploaded file is empty.');
          return;
        }

        const newRecords: RecordItem[] = [];

        // Look for header row index
        let headerRowIndex = -1;
        let categoryCol = -1, nameCol = -1, phicCol = -1, icdCol = -1, encoderCol = -1;

        for (let r = 0; r < Math.min(15, rawData.length); r++) {
          const row = rawData[r];
          if (Array.isArray(row)) {
            row.forEach((cell: any, cIdx: number) => {
              const str = String(cell || '').trim().toUpperCase();
              if (str.includes('CATEGORY')) categoryCol = cIdx;
              if (str.includes('PATIENT') || str.includes('NAME')) nameCol = cIdx;
              if ((str.includes('PHIC') || str === 'CAT') && cIdx !== categoryCol) phicCol = cIdx;
              if (str.includes('ICD') || str.includes('RVS')) icdCol = cIdx;
              if (str.includes('ENCODER')) encoderCol = cIdx;
            });
            if (nameCol !== -1) {
              headerRowIndex = r;
              break;
            }
          }
        }

        if (headerRowIndex !== -1 && nameCol !== -1) {
          for (let r = headerRowIndex + 1; r < rawData.length; r++) {
            const row = rawData[r];
            if (!row || row.length === 0) continue;

            const pName = String(row[nameCol] || '').trim();
            if (!pName || pName.toUpperCase() === 'PATIENT NAME' || pName.startsWith('#')) continue;

            const cat = categoryCol !== -1 && row[categoryCol] ? String(row[categoryCol]).trim().toUpperCase() : category;
            const phic = phicCol !== -1 && row[phicCol] ? String(row[phicCol]).trim() : 'PR-M';
            const icdVal = icdCol !== -1 && row[icdCol] ? String(row[icdCol]).trim() : '';
            const enc = encoderCol !== -1 && row[encoderCol] ? String(row[encoderCol]).trim() : encoder;

            newRecords.push({
              id: (Date.now() + Math.random()).toString(),
              category: cat || 'ADMISSION',
              patientName: pName,
              phicCat: phic,
              icd: icdVal,
              amount: null,
              encoderName: enc
            });
          }
        } else {
          // Fallback: parse simple multi-column rows or standard list
          for (let r = 0; r < rawData.length; r++) {
            const row = rawData[r];
            if (Array.isArray(row) && row.length >= 2) {
              const val1 = String(row[1] || '').trim();
              if (val1 && val1.toUpperCase() !== 'PATIENT NAME' && !val1.startsWith('#')) {
                newRecords.push({
                  id: (Date.now() + Math.random()).toString(),
                  category: String(row[0] || category).trim().toUpperCase(),
                  patientName: val1,
                  phicCat: String(row[2] || 'PR-M').trim(),
                  icd: String(row[3] || '').trim(),
                  amount: null,
                  encoderName: String(row[4] || encoder).trim()
                });
              }
            }
          }
        }

        if (newRecords.length === 0) {
          alert('⚠️ No valid patient entries found in file. Please download and fill out the CSV Template.');
          return;
        }

        const merged = deduplicateRecords([...records, ...newRecords]);
        setRecords(merged);
        localStorage.setItem(`philhealth_recs_${currentDate}`, JSON.stringify(merged));

        // Push to Supabase if configured
        if (isSupabaseConfigured()) {
          for (const item of newRecords) {
            try {
              await supabase.from('records').insert({
                date_key: currentDate,
                category: item.category,
                patient_name: item.patientName,
                phic_cat: item.phicCat,
                icd_code: item.icd,
                amount: null,
                encoder_name: item.encoderName || encoder
              });
            } catch (e) {}
          }
        }

        fetchPastWorksheets();
        alert(`✅ Successfully imported ${newRecords.length} patient entries into ${currentDate}!`);
      } catch (err: any) {
        alert(`❌ Error parsing file: ${err?.message || 'Invalid Excel/CSV format'}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Handle Official Hospital Print Endorsement Sheet
  const handlePrintSheet = () => {
    window.print();
  };

  // Full System Data Backup (.JSON)
  const handleBackupSystem = () => {
    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('philhealth_') || key.startsWith('supabase.'))) {
        backupData[key] = localStorage.getItem(key);
      }
    }

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `philhealth_logbook_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(r => {
    const matchesCategory = activeFilter === 'ALL' || r.category === activeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.icd && r.icd.toLowerCase().includes(q)) ||
      (r.phicCat && r.phicCat.toLowerCase().includes(q)) ||
      (r.encoderName && r.encoderName.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 pb-12 transition-colors relative overflow-hidden backdrop-blur-[2px]">
      
      {/* Background Ambient Parallax Floating Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none animate-float"></div>
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none animate-float-reverse"></div>
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none animate-glow"></div>

      {/* Background Hospital Logo Watermark Wrap */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        <img
          src="/hospital-logo.png"
          alt="Cebu Provincial Hospital Balamban Watermark"
          className="w-[550px] sm:w-[700px] md:w-[850px] max-w-[90vw] opacity-[0.05] dark:opacity-[0.07] filter contrast-125 saturate-150 blur-[0.5px] scale-105 pointer-events-none"
        />
      </div>

      <Navbar 
        userEmail={userEmail} 
        onExportExcel={exportExcel} 
        onImportExcelCsv={handleFileUpload}
        onDownloadCsvTemplate={downloadCsvTemplate}
        onPrintSheet={handlePrintSheet}
        onOpenAnalytics={() => setShowAnalyticsModal(true)}
        onBackupSystem={handleBackupSystem}
      />

      <main className="max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-4 md:pt-6 space-y-4 md:space-y-6 relative z-10 no-print">

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

        {/* Add / Edit Patient Entry Modal Pop-up */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in animate-modal-backdrop">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative z-10 animate-scale-up transform transition-all">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${editingId ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600'}`}>
                    {editingId ? <Pencil className="w-5 h-5 animate-pulse" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {editingId ? 'Edit Patient Entry' : 'Add Logbook Entry'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">
                      {currentDate} • Hospital Endorsement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {dupError && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold">
                  ⚠️ {dupError}
                </div>
              )}

              <form onSubmit={handleAddRecord} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Section Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Patient Name (LAST, FIRST MIDDLE)
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. DELA CRUZ, JUAN"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    PHIC Membership (Cat)
                  </label>
                  <input
                    type="text"
                    list="membershipListModal"
                    required
                    value={phicCat}
                    onChange={(e) => setPhicCat(e.target.value)}
                    placeholder="e.g. PR-M, SC-M, POS-FI-D"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="membershipListModal">
                    {REF_MEMBERSHIPS.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    ICD10 / RVS Code
                  </label>
                  <input
                    type="text"
                    value={icd}
                    onChange={(e) => setIcd(e.target.value)}
                    placeholder="e.g. 59513, NSD01, A09.9, or any new ICD10 code"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Quick:</span>
                    {['NSD01', '59513', 'A09.9', 'K29.7', 'J06.9', 'I10'].map(code => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setIcd(code)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-1/3 py-2.5 text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`w-2/3 py-2.5 font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm text-white ${
                      editingId 
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' 
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                    }`}
                  >
                    {editingId ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Update Entry' : 'Save Patient Entry'}</span>
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* Logbook Data View (Full Width) */}
        <div className="w-full space-y-3 md:space-y-4">
          
          {/* Top Bar: Add Logbook Entry Action & Search & Filter */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Prominent Add Entry Pop-up Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setPatientName('');
                  setIcd('');
                  setHci('');
                  setPf('');
                  setDupError('');
                  setShowAddModal(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center gap-2 text-xs md:text-sm transition transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" />
                <span>Add Logbook Entry</span>
              </button>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
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
            </div>

              {/* Global Search Bar */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patient, ICD, encoder..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white shadow-sm"
                />
              </div>
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
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit Button - Available for BOTH Admin and Encoders */}
                              <button
                                onClick={() => handleStartEdit(r)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 rounded-lg transition"
                                title="Edit patient entry"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Delete Button - Admin Only */}
                              {isAdmin ? (
                                <button
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition"
                                  title="Delete patient entry (Admin Only)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="p-1.5 text-slate-300 dark:text-slate-700 cursor-not-allowed rounded-lg"
                                  title="Only ADMIN users can delete patient entries"
                                >
                                  <Trash2 className="w-4 h-4 opacity-40" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </main>

      {/* Analytics Modal */}
      <AnalyticsModal 
        isOpen={showAnalyticsModal} 
        onClose={() => setShowAnalyticsModal(false)} 
        records={records} 
        currentDate={currentDate} 
      />

      {/* Printable Official Hospital Endorsement Sheet */}
      <div className="hidden print-only p-8 text-black space-y-6">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            <img src="/hospital-logo.png" alt="Hospital Seal" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide">Cebu Provincial Hospital - Balamban</h1>
              <p className="text-sm font-semibold">PhilHealth Daily Endorsement & Logbook Summary Sheet</p>
            </div>
          </div>
          <div className="text-right text-xs font-mono">
            <p><strong>Date:</strong> {currentDate}</p>
            <p><strong>Encoder:</strong> {encoder}</p>
            <p><strong>Total Patients:</strong> {records.length}</p>
          </div>
        </div>

        {/* Section Summary Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Section Patient Summary Breakdown</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100">
                {['ADMISSION', 'MINOR (ER)', 'MINOR (OPD)', 'DENTAL', 'OECB', 'ANIMAL BITE', 'PAIN MANAGEMENT'].map(cat => (
                  <th key={cat} className="p-2 border border-slate-400 text-center font-bold text-[10px]">{cat}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {['ADMISSION', 'MINOR (ER)', 'MINOR (OPD)', 'DENTAL', 'OECB', 'ANIMAL BITE', 'PAIN MANAGEMENT'].map(cat => (
                  <td key={cat} className="p-2 border border-slate-400 text-center font-bold text-sm">
                    {records.filter(r => r.category === cat).length}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Full Patient List Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2">Patient Endorsement Records</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="p-2 border">#</th>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Patient Name</th>
                <th className="p-2 border">PHIC Cat</th>
                <th className="p-2 border">ICD10 / RVS</th>
                <th className="p-2 border">Encoder</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.id}>
                  <td className="p-2 border text-center font-mono">{idx + 1}</td>
                  <td className="p-2 border font-bold">{r.category}</td>
                  <td className="p-2 border font-semibold">{r.patientName}</td>
                  <td className="p-2 border text-center font-mono">{r.phicCat}</td>
                  <td className="p-2 border font-mono">{r.icd || '-'}</td>
                  <td className="p-2 border">{r.encoderName || encoder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Official Signatures Block */}
        <div className="pt-12 grid grid-cols-2 gap-12 text-xs">
          <div>
            <p className="font-bold">Prepared By:</p>
            <div className="mt-8 border-b border-black w-48"></div>
            <p className="mt-1 font-semibold">{encoder}</p>
            <p className="text-[10px] text-slate-500">PhilHealth Encoder</p>
          </div>
          <div>
            <p className="font-bold">Approved / Noted By:</p>
            <div className="mt-8 border-b border-black w-48"></div>
            <p className="mt-1 font-semibold">Hospital Supervisor / Admin</p>
            <p className="text-[10px] text-slate-500">Cebu Provincial Hospital - Balamban</p>
          </div>
        </div>
      </div>

    </div>
  );
}

function AnalyticsModal({ isOpen, onClose, records, currentDate }: { isOpen: boolean; onClose: () => void; records: RecordItem[]; currentDate: string }) {
  if (!isOpen) return null;

  const categories = ['ADMISSION', 'MINOR (ER)', 'MINOR (OPD)', 'DENTAL', 'OECB', 'ANIMAL BITE', 'PAIN MANAGEMENT'];
  const total = records.length || 1;

  const phicCounts: Record<string, number> = {};
  records.forEach(r => {
    const c = r.phicCat || 'PR-M';
    phicCounts[c] = (phicCounts[c] || 0) + 1;
  });

  const icdCounts: Record<string, number> = {};
  records.forEach(r => {
    if (r.icd) {
      icdCounts[r.icd] = (icdCounts[r.icd] || 0) + 1;
    }
  });
  const topIcds = Object.entries(icdCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md no-print animate-fade-in animate-modal-backdrop">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto animate-scale-up">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 rounded-2xl">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Logbook Analytics & Claims Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Worksheet Date: <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentDate}</span>
            </p>
          </div>
        </div>

        {/* Section Volume Breakdown Progress Bars */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Patient Volume by Section Category
          </h4>
          <div className="space-y-2">
            {categories.map(cat => {
              const count = records.filter(r => r.category === cat).length;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{cat}</span>
                    <span>{count} patients ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PHIC Membership & Top ICD Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              PHIC Membership Breakdown
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {Object.entries(phicCounts).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-xs font-semibold">
                  <span className="font-mono text-amber-600 dark:text-amber-400">{cat}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{count} patients</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Top Encoded ICD-10 / RVS Codes
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {topIcds.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No ICD codes recorded yet.</p>
              ) : (
                topIcds.map(([code, count]) => (
                  <div key={code} className="flex justify-between text-xs font-semibold">
                    <span className="font-mono text-blue-600 dark:text-blue-400">{code}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{count} cases</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
