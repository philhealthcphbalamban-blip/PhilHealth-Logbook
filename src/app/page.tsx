'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { REF_MEMBERSHIPS, REF_ICD_MAP } from '@/lib/refData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Users, DollarSign, Calendar, Plus, Trash2, Sparkles
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
}

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState('');
  const [encoder, setEncoder] = useState('Juvy');
  const [userEmail, setUserEmail] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Form State
  const [category, setCategory] = useState('ADMISSION');
  const [patientName, setPatientName] = useState('');
  const [phicCat, setPhicCat] = useState('PR-M');
  const [icd, setIcd] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [hci, setHci] = useState<string>('');
  const [pf, setPf] = useState<string>('');
  const [rateNotice, setRateNotice] = useState('');

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    setCurrentDate(todayStr);

    const savedEncoder = localStorage.getItem('philhealth_encoder') || 'Juvy';
    const savedEmail = localStorage.getItem('philhealth_user_email') || '';
    setEncoder(savedEncoder);
    setUserEmail(savedEmail);

    loadSavedRecords(todayStr);
  }, []);

  const loadSavedRecords = async (dateKey: string) => {
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('records')
        .select('*')
        .eq('date_key', dateKey);

      if (data && data.length > 0) {
        setRecords(data.map(r => ({
          id: r.id,
          category: r.category,
          patientName: r.patient_name,
          phicCat: r.phic_cat,
          icd: r.icd_code,
          amount: r.amount,
          hci: r.hci_amount,
          pf: r.pf_amount
        })));
        return;
      }
    }

    const localData = localStorage.getItem(`philhealth_recs_${dateKey}`);
    if (localData) {
      try {
        setRecords(JSON.parse(localData));
      } catch (e) {
        setRecords([]);
      }
    } else {
      setRecords([]);
    }
  };

  const handleIcdInput = (val: string) => {
    setIcd(val);
    if (REF_ICD_MAP[val.trim().toUpperCase()]) {
      const rate = REF_ICD_MAP[val.trim().toUpperCase()];
      if (rate !== null && rate !== undefined) {
        setRateNotice(`Ref Rate: ₱ ${rate.toLocaleString()}`);
        setAmount(String(rate));
      } else {
        setRateNotice('');
      }
    } else {
      setRateNotice('');
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    const newRec: RecordItem = {
      id: String(Date.now()),
      category,
      patientName: patientName.trim().toUpperCase(),
      phicCat: phicCat.trim().toUpperCase(),
      icd: icd.trim().toUpperCase(),
      amount: amount !== '' ? parseFloat(amount) : null,
      hci: hci !== '' ? parseFloat(hci) : null,
      pf: pf !== '' ? parseFloat(pf) : null
    };

    const updated = [...records, newRec];
    setRecords(updated);

    if (isSupabaseConfigured()) {
      await supabase.from('records').insert({
        date_key: currentDate,
        category: newRec.category,
        patient_name: newRec.patientName,
        phic_cat: newRec.phicCat,
        icd_code: newRec.icd,
        amount: newRec.amount,
        hci_amount: newRec.hci,
        pf_amount: newRec.pf,
        encoder_name: encoder
      });
    }
    localStorage.setItem(`philhealth_recs_${currentDate}`, JSON.stringify(updated));

    setPatientName('');
    setIcd('');
    setAmount('');
    setHci('');
    setPf('');
    setRateNotice('');
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);

    if (isSupabaseConfigured()) {
      await supabase.from('records').delete().eq('id', id);
    }
    localStorage.setItem(`philhealth_recs_${currentDate}`, JSON.stringify(updated));
  };

  const exportExcel = () => {
    const catMap: Record<string, number> = {
      'ADMISSION': 0,
      'MINOR (ER)': 6,
      'MINOR (OPD)': 11,
      'DENTAL': 16,
      'OECB': 22,
      'ANIMAL BITE': 28,
      'PAIN MANAGEMENT': 33
    };

    const wb = XLSX.utils.book_new();
    const grid: any[][] = [];
    for (let r = 0; r < 100; r++) grid.push(new Array(40).fill(null));

    grid[0][2] = 'Employee:';
    grid[0][3] = encoder;
    grid[0][11] = 'OUTPATIENT';

    grid[1][1] = 'ADMISSION';
    grid[1][6] = 'MINOR (ER)';
    grid[1][11] = 'MINOR (OPD)';
    grid[1][16] = 'DENTAL';
    grid[1][22] = 'OECB';
    grid[1][28] = 'ANIMAL BITE';
    grid[1][33] = 'PAIN MANAGEMENT';

    grid[2][0] = '#'; grid[2][1] = 'Patient Name'; grid[2][2] = 'Cat'; grid[2][3] = 'ICD/RVS'; grid[2][4] = 'Amount';
    grid[2][6] = '#'; grid[2][7] = 'Patient Name'; grid[2][8] = 'Cat'; grid[2][9] = 'ICD/RVS';
    grid[2][16] = '#'; grid[2][17] = 'Patient Name'; grid[2][18] = 'Cat'; grid[2][19] = 'ICD/RVS'; grid[2][20] = 'Amount';
    grid[2][22] = '#'; grid[2][23] = 'Patient Name'; grid[2][24] = 'Cat'; grid[2][25] = 'ICD/RVS'; grid[2][26] = 'Amount';
    grid[2][33] = '#'; grid[2][34] = 'Patient Name'; grid[2][35] = 'Cat'; grid[2][36] = 'ICD/RVS';

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
      if (rec.amount !== null) grid[rowIdx][startCol + 4] = rec.amount;
    });

    const ws = XLSX.utils.aoa_to_sheet(grid);
    XLSX.utils.book_append_sheet(wb, ws, currentDate.substring(0, 31));
    XLSX.writeFile(wb, `PhilHealth_${currentDate.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const filteredRecords = activeFilter === 'ALL' 
    ? records 
    : records.filter(r => r.category === activeFilter);

  const totalAmount = records.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 transition-colors">
      
      <Navbar userEmail={userEmail} onExportExcel={exportExcel} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Current Worksheet</span>
              <input
                type="text"
                value={currentDate}
                onChange={(e) => {
                  setCurrentDate(e.target.value.toUpperCase());
                  loadSavedRecords(e.target.value.toUpperCase());
                }}
                className="block text-xl font-extrabold bg-transparent text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-400 uppercase font-semibold block">Encoder Name</span>
              <input
                type="text"
                value={encoder}
                onChange={(e) => setEncoder(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Patients</p>
              <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{records.length}</h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Amount (₱)</p>
              <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">₱ {totalAmount.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Categories</p>
              <h3 className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                {new Set(records.map(r => r.category)).size}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Plus className="w-5 h-5 text-emerald-500" />
              <span>Add Logbook Entry</span>
            </h2>

            <form onSubmit={handleAddRecord} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Section Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
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
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Patient Name (LAST, FIRST MIDDLE)
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. DELA CRUZ, JUAN"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  PHIC Membership (Cat)
                </label>
                <input
                  type="text"
                  list="membershipList"
                  required
                  value={phicCat}
                  onChange={(e) => setPhicCat(e.target.value)}
                  placeholder="e.g. PR-M, SC-M, POS-FI-D"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <datalist id="membershipList">
                  {REF_MEMBERSHIPS.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    ICD10 / RVS Code
                  </label>
                  {rateNotice && <span className="text-xs text-emerald-500 font-mono font-semibold">{rateNotice}</span>}
                </div>
                <input
                  type="text"
                  list="icdList"
                  value={icd}
                  onChange={(e) => handleIcdInput(e.target.value)}
                  placeholder="e.g. 59513, NSD01, A09.9"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <datalist id="icdList">
                  {Object.keys(REF_ICD_MAP).map(code => (
                    <option key={code} value={code}>₱ {REF_ICD_MAP[code]}</option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Amount (₱)
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Rate amount"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Save Entry</span>
              </button>

            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Patient Name</th>
                      <th className="p-3.5">Cat</th>
                      <th className="p-3.5">ICD/RVS</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5 text-right">Action</th>
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
                          <td className="p-3.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">{r.category}</td>
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{r.patientName}</td>
                          <td className="p-3.5 font-mono text-amber-600 dark:text-amber-400">{r.phicCat}</td>
                          <td className="p-3.5 font-mono text-blue-600 dark:text-blue-400">{r.icd || '-'}</td>
                          <td className="p-3.5 font-mono">
                            {r.amount !== null ? `₱ ${r.amount.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3.5 text-right">
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
