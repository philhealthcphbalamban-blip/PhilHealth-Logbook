'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { REF_MEMBERSHIPS, REF_ICD_MAP } from '@/lib/refData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Users, Calendar, Plus, Trash2, Sparkles, FolderOpen, RefreshCw, Search, Printer, BarChart3, Database, X, CheckCircle, Pencil, Cloud, HardDrive, FileText, Clock, Wrench
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
  entryTime?: string;
  isUnpushed?: boolean;
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

const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const getStandardDateKey = (d: Date = new Date()) => {
  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
};

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState('');
  const [pastDates, setPastDates] = useState<string[]>([]);
  const [encoder, setEncoder] = useState('Juvy');
  const [userRole, setUserRole] = useState('ENCODER');
  const [userEmail, setUserEmail] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeEncoderFilter, setActiveEncoderFilter] = useState('ALL');
  const [dupError, setDupError] = useState('');

  // New Features State
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Form State (Amount input removed as requested)
  const [category, setCategory] = useState('ADMISSION');
  const [patientName, setPatientName] = useState('');
  const [phicCat, setPhicCat] = useState('PR-M');
  const [icd, setIcd] = useState('');
  const [hci, setHci] = useState('');
  const [pf, setPf] = useState('');
  const [entryTime, setEntryTime] = useState('');

  const [selectedIsoDate, setSelectedIsoDate] = useState(() => new Date().toISOString().split('T')[0]);

  const checkMaintenanceStatus = async () => {
    let active = localStorage.getItem('philhealth_maintenance_mode') === 'true';
    if (isSupabaseConfigured()) {
      try {
        const { data: sysRec } = await supabase.from('records')
          .select('patient_name')
          .eq('date_key', '__SYSTEM_SETTING__')
          .eq('category', 'MAINTENANCE')
          .maybeSingle();
        if (sysRec && sysRec.patient_name !== undefined) {
          active = sysRec.patient_name.trim().toLowerCase() === 'true';
        }
      } catch (e) {}
    }
    setIsMaintenanceMode(active);
    localStorage.setItem('philhealth_maintenance_mode', String(active));
  };

  useEffect(() => {
    const todayStr = getStandardDateKey(new Date());
    setCurrentDate(todayStr);

    const savedEncoder = localStorage.getItem('philhealth_encoder') || 'Juvy';
    const savedEmail = localStorage.getItem('philhealth_user_email') || '';
    const savedRole = localStorage.getItem('philhealth_user_role') || 'ENCODER';
    const savedAvatar = 
      localStorage.getItem(`philhealth_avatar_${savedEncoder.trim().toLowerCase()}`) || 
      localStorage.getItem('philhealth_avatar_user') || 
      '';
    setEncoder(savedEncoder);
    setUserEmail(savedEmail);
    setUserRole(savedRole);
    setUserAvatar(savedAvatar);

    checkMaintenanceStatus();
    fetchPastWorksheets();
    loadSavedRecords(todayStr);
  }, []);

  // Real-time Multi-User Cloud Synchronization (Supabase Realtime + 3-second Auto Polling)
  useEffect(() => {
    if (!currentDate) return;

    loadSavedRecords(currentDate);
    checkMaintenanceStatus();

    // Auto-poll cloud every 3 seconds so Admin and Users are ALWAYS synchronized in real time
    const pollInterval = setInterval(() => {
      loadSavedRecords(currentDate);
      checkMaintenanceStatus();
    }, 3000);

    // Supabase Realtime WebSocket Listener for instant sync (<500ms)
    let channel: any = null;
    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel(`public:records:${currentDate.replace(/[^a-zA-Z0-9]/g, '_')}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'records' },
            () => {
              loadSavedRecords(currentDate);
              checkMaintenanceStatus();
            }
          )
          .subscribe();
      } catch (e) {}
    }

    return () => {
      clearInterval(pollInterval);
      if (channel && isSupabaseConfigured()) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [currentDate]);

  // Auto-sync Entry Time with Computer Clock whenever Add Modal is open for a new entry
  useEffect(() => {
    if (!showAddModal || editingId) return;

    const getComputerTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    setEntryTime(getComputerTime());

    const interval = setInterval(() => {
      setEntryTime(getComputerTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [showAddModal, editingId]);

  const isAdmin = userRole === 'ADMIN' || encoder.toLowerCase().includes('admin');

  const handleToggleMaintenance = async () => {
    if (!isAdmin) return;
    const newStatus = !isMaintenanceMode;
    const statusVal = String(newStatus);
    setIsMaintenanceMode(newStatus);
    localStorage.setItem('philhealth_maintenance_mode', statusVal);

    if (isSupabaseConfigured()) {
      try {
        const { data: sysRec } = await supabase.from('records')
          .select('id')
          .eq('date_key', '__SYSTEM_SETTING__')
          .eq('category', 'MAINTENANCE')
          .maybeSingle();

        if (sysRec && sysRec.id) {
          await supabase.from('records').update({ patient_name: statusVal }).eq('id', sysRec.id);
        } else {
          await supabase.from('records').insert({
            date_key: '__SYSTEM_SETTING__',
            category: 'MAINTENANCE',
            patient_name: statusVal,
            phic_cat: 'SYS',
            icd_code: 'SYS',
            encoder_name: 'Admin'
          });
        }
      } catch (e) {}
    }

    alert(newStatus 
      ? '⚠️ Maintenance Mode ENABLED! Non-admin users are now blocked from using the site.' 
      : '✅ Maintenance Mode DISABLED! Full access restored for all users.'
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('philhealth_encoder');
    localStorage.removeItem('philhealth_user_email');
    localStorage.removeItem('philhealth_user_role');
    if (isSupabaseConfigured()) {
      supabase.auth.signOut().catch(() => {});
    }
    window.location.href = '/login';
  };

  const handleDatePickerChange = (isoVal: string) => {
    if (!isoVal) return;
    setSelectedIsoDate(isoVal);

    const parts = isoVal.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const formattedKey = getStandardDateKey(d);
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
            if (r.date_key) datesSet.add(r.date_key.trim().toUpperCase());
          });
        }
      } catch (e) {}
    }

    // Check localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('philhealth_recs_')) {
        datesSet.add(key.replace('philhealth_recs_', '').trim().toUpperCase());
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

  const saveRecordsToLocalAndBackup = (dateKey: string, recs: RecordItem[]) => {
    try {
      const clean = deduplicateRecords(recs);
      localStorage.setItem(`philhealth_recs_${dateKey}`, JSON.stringify(clean));
      
      // Save to master backup map so entries are NEVER lost
      const masterStr = localStorage.getItem('philhealth_master_backup') || '{}';
      const masterMap = JSON.parse(masterStr);
      masterMap[dateKey] = deduplicateRecords([...(masterMap[dateKey] || []), ...clean]);
      localStorage.setItem('philhealth_master_backup', JSON.stringify(masterMap));
    } catch (e) {}
  };

  const syncLocalToCloud = async (dateKey: string, localRecs: RecordItem[], cloudRecs: RecordItem[]) => {
    if (!isSupabaseConfigured() || localRecs.length === 0) return;

    let deletedKeys = new Set<string>();
    try {
      deletedKeys = new Set(JSON.parse(localStorage.getItem('philhealth_deleted_keys') || '[]'));
    } catch (e) {}

    // Find ONLY strictly unpushed local entries that are NOT deleted
    const unpushed = localRecs.filter(loc => {
      if (!loc.patientName) return false;
      if (loc.isUnpushed !== true) return false;
      const key = `${dateKey.trim().toUpperCase()}||${loc.patientName.trim().toUpperCase()}||${loc.category.trim().toUpperCase()}`;
      if (deletedKeys.has(key)) return false;
      return !cloudRecs.some(c => 
        c.patientName.trim().toUpperCase() === loc.patientName.trim().toUpperCase() && 
        c.category.trim().toUpperCase() === loc.category.trim().toUpperCase()
      );
    });

    if (unpushed.length > 0) {
      for (const item of unpushed) {
        const payload: any = {
          date_key: dateKey,
          category: item.category,
          patient_name: item.patientName,
          phic_cat: item.phicCat,
          icd_code: item.icd,
          amount: item.amount,
          hci_amount: item.hci,
          pf_amount: item.pf,
          encoder_name: item.encoderName || encoder || 'System'
        };
        try {
          const { error } = await supabase.from('records').insert({ ...payload, entry_time: item.entryTime });
          if (error) {
            await supabase.from('records').insert(payload);
          }
          item.isUnpushed = false;
        } catch (e) {}
      }
    }
  };

  const loadSavedRecords = async (dateKey: string) => {
    if (!dateKey) return;
    const targetKey = dateKey.trim().toUpperCase();

    let deletedKeys = new Set<string>();
    try {
      deletedKeys = new Set(JSON.parse(localStorage.getItem('philhealth_deleted_keys') || '[]'));
    } catch (e) {}

    // 1. Instant local-first rendering with master backup recovery
    let localRecords: RecordItem[] = [];
    const localData = localStorage.getItem(`philhealth_recs_${dateKey}`);
    if (localData) {
      try {
        localRecords = JSON.parse(localData);
      } catch (e) {}
    }

    // Check master backup if localRecords is empty
    if (localRecords.length === 0) {
      try {
        const masterStr = localStorage.getItem('philhealth_master_backup') || '{}';
        const masterMap = JSON.parse(masterStr);
        if (masterMap[targetKey] && Array.isArray(masterMap[targetKey]) && masterMap[targetKey].length > 0) {
          localRecords = masterMap[targetKey];
          localStorage.setItem(`philhealth_recs_${dateKey}`, JSON.stringify(localRecords));
        }
      } catch (e) {}
    }

    // Filter out deleted keys from local view
    localRecords = localRecords.filter(r => {
      if (!r.patientName) return false;
      const key = `${targetKey}||${r.patientName.trim().toUpperCase()}||${r.category.trim().toUpperCase()}`;
      return !deletedKeys.has(key);
    });

    setRecords(deduplicateRecords(localRecords));

    // 2. Query Supabase (Cloud Multi-User Real-time Sync)
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('records')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data) {
          // Filter matching date_key case-insensitively across all computers & encoders, excluding system settings
          const matchingData = data.filter((d: any) => 
            d.date_key && 
            d.date_key.trim().toUpperCase() === targetKey && 
            d.date_key !== '__SYSTEM_SETTING__'
          );

          const cloudRecords: RecordItem[] = matchingData
            .map((d: any) => ({
              id: String(d.id || Date.now()),
              category: d.category,
              patientName: d.patient_name,
              phicCat: d.phic_cat,
              icd: d.icd_code,
              amount: d.amount,
              hci: d.hci_amount,
              pf: d.pf_amount,
              encoderName: d.encoder_name,
              entryTime: d.entry_time || (d.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined)
            }))
            .filter((r: RecordItem) => {
              if (!r.patientName) return false;
              const key = `${targetKey}||${r.patientName.trim().toUpperCase()}||${r.category.trim().toUpperCase()}`;
              return !deletedKeys.has(key);
            });

          const cleanCloud = deduplicateRecords(cloudRecords);

          // Find strictly unpushed local entries
          const unpushed = localRecords.filter(loc => loc.isUnpushed === true);

          if (unpushed.length > 0) {
            syncLocalToCloud(dateKey, localRecords, cleanCloud);
          }

          const finalRecords = deduplicateRecords([...cleanCloud, ...unpushed]);
          setRecords(finalRecords);

          // Update local cache and master backup with synchronized cloud data (removes deleted entries)
          localStorage.setItem(`philhealth_recs_${dateKey}`, JSON.stringify(finalRecords));
          try {
            const masterStr = localStorage.getItem('philhealth_master_backup') || '{}';
            const masterMap = JSON.parse(masterStr);
            masterMap[targetKey] = finalRecords;
            localStorage.setItem('philhealth_master_backup', JSON.stringify(masterMap));
          } catch (e) {}
        }
      } catch (e) {}
    }
  };

  const handleDateSwitch = (newDate: string) => {
    setCurrentDate(newDate);
    loadSavedRecords(newDate);
  };

  const handleStartEdit = (rec: RecordItem) => {
    const recEncoder = (rec.encoderName || 'System').trim().toLowerCase();
    const currentEnc = (encoder || '').trim().toLowerCase();
    const canEdit = isAdmin || recEncoder === currentEnc;

    if (!canEdit) {
      alert(`⚠️ Edit Restricted: Patient entry was encoded by "${rec.encoderName || 'another encoder'}". Only ${rec.encoderName || 'the original encoder'} or Admin can edit this record.`);
      return;
    }

    setEditingId(rec.id);
    setCategory(rec.category);
    setPatientName(rec.patientName);
    setPhicCat(rec.phicCat);
    setIcd(rec.icd || '');
    setHci(rec.hci !== undefined && rec.hci !== null ? String(rec.hci) : '');
    setPf(rec.pf !== undefined && rec.pf !== null ? String(rec.pf) : '');
    setEntryTime(rec.entryTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setDupError('');
    setShowAddModal(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPatientName('');
    setIcd('');
    setHci('');
    setPf('');
    setEntryTime('');
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
    const finalTime = entryTime.trim() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

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
            encoderName: r.encoderName || encoder || 'System',
            entryTime: finalTime
          };
        }
        return r;
      });

      setRecords(updatedRecords);
      saveRecordsToLocalAndBackup(currentDate, updatedRecords);

      if (isSupabaseConfigured()) {
        try {
          const updatePayload: any = {
            category: cleanCategory,
            patient_name: cleanPatient,
            phic_cat: phicCat.trim().toUpperCase(),
            icd_code: cleanIcd,
            hci_amount: hci !== '' ? parseFloat(hci) : null,
            pf_amount: pf !== '' ? parseFloat(pf) : null
          };
          const { error } = await supabase.from('records').update({ ...updatePayload, entry_time: finalTime }).eq('id', editingId);
          if (error) {
            await supabase.from('records').update(updatePayload).eq('id', editingId);
          }
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
      encoderName: encoder || 'System',
      entryTime: finalTime
    };

    const updated = deduplicateRecords([...records, newRec]);
    setRecords(updated);
    saveRecordsToLocalAndBackup(currentDate, updated);

    if (isSupabaseConfigured()) {
      try {
        const payload: any = {
          date_key: currentDate,
          category: newRec.category,
          patient_name: newRec.patientName,
          phic_cat: newRec.phicCat,
          icd_code: newRec.icd,
          amount: newRec.amount,
          hci_amount: newRec.hci,
          pf_amount: newRec.pf,
          encoder_name: newRec.encoderName
        };
        const { error } = await supabase.from('records').insert({ ...payload, entry_time: newRec.entryTime });
        if (error) {
          // Fallback if entry_time column does not exist in Supabase schema
          await supabase.from('records').insert(payload);
        }
      } catch (e) {}
    }

    fetchPastWorksheets();

    setPatientName('');
    setIcd('');
    setHci('');
    setPf('');
  };

  const handleDeleteRecord = async (id: string) => {
    const recToDelete = records.find(r => r.id === id);
    if (!recToDelete) return;

    if (!confirm(`Are you sure you want to delete patient entry "${recToDelete.patientName}"?`)) {
      return;
    }

    const cleanPatient = recToDelete.patientName.trim();
    const cleanCategory = recToDelete.category.trim();
    const targetKey = currentDate.trim().toUpperCase();

    // Track deleted key in localStorage so deleted records never re-upload
    const deleteKey = `${targetKey}||${cleanPatient.toUpperCase()}||${cleanCategory.toUpperCase()}`;
    try {
      const deletedList = JSON.parse(localStorage.getItem('philhealth_deleted_keys') || '[]');
      if (!deletedList.includes(deleteKey)) {
        deletedList.push(deleteKey);
        localStorage.setItem('philhealth_deleted_keys', JSON.stringify(deletedList));
      }
    } catch (e) {}

    const updated = records.filter(r => r.id !== id);
    setRecords(updated);

    // Save updated list to local storage & master backup
    localStorage.setItem(`philhealth_recs_${currentDate}`, JSON.stringify(updated));
    try {
      const masterStr = localStorage.getItem('philhealth_master_backup') || '{}';
      const masterMap = JSON.parse(masterStr);
      if (masterMap[targetKey]) {
        masterMap[targetKey] = masterMap[targetKey].filter((r: RecordItem) => 
          !(r.patientName.trim().toUpperCase() === cleanPatient.toUpperCase() && r.category.trim().toUpperCase() === cleanCategory.toUpperCase())
        );
        localStorage.setItem('philhealth_master_backup', JSON.stringify(masterMap));
      }
    } catch(e) {}

    // Delete from Supabase Cloud completely
    if (isSupabaseConfigured()) {
      try {
        // Delete by ID
        await supabase.from('records').delete().eq('id', id);

        // Delete by date_key, category, and patient_name to guarantee row removal
        await supabase.from('records').delete()
          .eq('date_key', currentDate)
          .eq('category', cleanCategory)
          .ilike('patient_name', cleanPatient);
      } catch (e) {}
    }
  };

  // Emergency Data Recovery Helper
  const handleRecoverData = () => {
    try {
      const masterStr = localStorage.getItem('philhealth_master_backup') || '{}';
      const masterMap = JSON.parse(masterStr);
      let combined: RecordItem[] = [...records];
      
      if (masterMap[currentDate] && Array.isArray(masterMap[currentDate])) {
        combined = [...combined, ...masterMap[currentDate]];
      }

      // Scan all philhealth_recs_ keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('philhealth_recs_')) {
          try {
            const items = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(items)) {
              items.forEach(it => {
                if (it.patientName) combined.push(it);
              });
            }
          } catch (e) {}
        }
      }

      const dedupped = deduplicateRecords(combined);
      setRecords(dedupped);
      saveRecordsToLocalAndBackup(currentDate, dedupped);
      syncLocalToCloud(currentDate, dedupped, []);
      fetchPastWorksheets();
      alert(`✅ Data Recovery Scan Complete! Restored and synced ${dedupped.length} total entries for ${currentDate}.`);
    } catch (e) {
      alert('⚠️ Recovery scan completed.');
    }
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

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const availableEncoders = Array.from(new Set(records.map(r => (r.encoderName || 'System').trim()))).filter(Boolean);

  const filteredRecords = records.filter(r => {
    const matchesCategory = activeFilter === 'ALL' || r.category === activeFilter;
    const recEnc = (r.encoderName || 'System').trim().toUpperCase();
    const matchesEncoder = activeEncoderFilter === 'ALL' || recEnc === activeEncoderFilter.trim().toUpperCase();
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.icd && r.icd.toLowerCase().includes(q)) ||
      (r.phicCat && r.phicCat.toLowerCase().includes(q)) ||
      (r.encoderName && r.encoderName.toLowerCase().includes(q)) ||
      (r.entryTime && r.entryTime.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q));
    return matchesCategory && matchesEncoder && matchesSearch;
  });

  return (
    <div className={`min-h-screen bg-slate-50/70 dark:bg-slate-950/70 text-slate-900 dark:text-slate-100 pb-12 transition-all duration-300 relative overflow-hidden backdrop-blur-[2px] ${
      isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'
    }`}>
      
      {/* Expandable Animated Sidebar Navigation */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggleExpand={() => setIsSidebarExpanded(!isSidebarExpanded)}
        mobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        currentEncoder={encoder}
        userRole={userRole}
        userAvatar={userAvatar}
        isAdmin={isAdmin}
        onOpenAddModal={() => {
          setEditingId(null);
          setPatientName('');
          setIcd('');
          setHci('');
          setPf('');
          setEntryTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
          setDupError('');
          setShowAddModal(true);
        }}
        onPrintSheet={handlePrintSheet}
        onOpenAnalytics={() => setShowAnalyticsModal(true)}
        onImportExcelCsv={handleFileUpload}
        onExportExcel={exportExcel}
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onOpenAvatarModal={() => setShowAvatarModal(true)}
        onLogout={handleLogout}
      />

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
        externalShowPasswordModal={showPasswordModal}
        onClosePasswordModal={() => setShowPasswordModal(false)}
        externalShowAvatarModal={showAvatarModal}
        onCloseAvatarModal={() => setShowAvatarModal(false)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onAvatarChange={(newAvatar) => {
          setUserAvatar(newAvatar);
          try {
            const enc = (encoder || localStorage.getItem('philhealth_encoder') || 'juvy').trim().toLowerCase();
            localStorage.setItem(`philhealth_avatar_${enc}`, newAvatar);
            localStorage.setItem('philhealth_avatar_user', newAvatar);
          } catch(e) {}
        }}
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

          {/* Encoder Name Info & Desktop Toolbar Status */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
            
            {/* Cloud Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              {isSupabaseConfigured() ? (
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

            {/* CSV Template Download Button */}
            <button
              onClick={downloadCsvTemplate}
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
              title="Download sample CSV template for bulk patient uploads"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>CSV Template</span>
            </button>

            {/* Theme Toggle */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
              <span className="text-slate-400 uppercase font-bold text-[10px] block">Encoder</span>
              <input
                type="text"
                value={encoder}
                onChange={(e) => setEncoder(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Admin Maintenance Mode Toggle */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleToggleMaintenance}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border shadow-xs ${
                  isMaintenanceMode
                    ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
                    : 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                }`}
                title={isMaintenanceMode ? "Click to Disable Maintenance Mode" : "Click to Enable Maintenance Mode"}
              >
                <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{isMaintenanceMode ? '⚠️ Maintenance: ON' : '🔧 Maintenance Mode'}</span>
              </button>
            )}

            <button
              onClick={handleRecoverData}
              className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition border border-amber-200 dark:border-amber-800 flex items-center gap-1 shadow-2xs"
              title="Scan and restore any local logbook entries for today"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              <span>Recover Entries</span>
            </button>

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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Entry Time
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                      <Clock className="w-3 h-3 animate-pulse text-emerald-500" />
                      <span>Computer Time (System Auto)</span>
                    </span>
                  </div>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3.5 top-3 text-emerald-500" />
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={entryTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed select-none focus:outline-none"
                    />
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
                  setEntryTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
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

              {/* Encoder View Filter Dropdown (Master View for Admin & Encoders) */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={activeEncoderFilter}
                  onChange={(e) => setActiveEncoderFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 shadow-sm transition"
                  title="Filter logbook entries by Encoder"
                >
                  <option value="ALL">🌐 All Encoders ({records.length} patients)</option>
                  {availableEncoders.map(enc => {
                    const count = records.filter(r => (r.encoderName || 'System').trim() === enc).length;
                    return (
                      <option key={enc} value={enc}>
                        👤 {enc} ({count} {count === 1 ? 'patient' : 'patients'})
                      </option>
                    );
                  })}
                </select>

                {/* Global Search Bar */}
                <div className="relative min-w-[180px] sm:w-60">
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
            </div>

            {/* Desktop Table View & Mobile Card View */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden">
              
              {/* Responsive Table */}
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 md:p-3.5">#</th>
                      <th className="p-3 md:p-3.5">Time</th>
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
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          No logbook entries found for category: {activeFilter}
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r, idx) => {
                        const recEncoder = (r.encoderName || 'System').trim().toLowerCase();
                        const currentEnc = (encoder || '').trim().toLowerCase();
                        const canEditRecord = isAdmin || recEncoder === currentEnc;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="p-3 md:p-3.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 md:p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                <span>{r.entryTime || '08:00 AM'}</span>
                              </span>
                            </td>
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
                                {/* Edit Button - Encoder Restricted */}
                                {canEditRecord ? (
                                  <button
                                    onClick={() => handleStartEdit(r)}
                                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 rounded-lg transition"
                                    title="Edit patient entry"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    onClick={() => alert(`⚠️ Access Restricted: Patient entry encoded by ${r.encoderName}. Only ${r.encoderName} or Admin can edit this entry.`)}
                                    className="p-1.5 text-slate-300 dark:text-slate-700 cursor-not-allowed rounded-lg opacity-40"
                                    title={`Only encoder "${r.encoderName || 'System'}" can edit this record`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}

                              {/* Delete Button - Enabled for All Users */}
                              <button
                                onClick={() => handleDeleteRecord(r.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition"
                                title="Delete patient entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
                <th className="p-2 border">Time</th>
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
                  <td className="p-2 border text-center font-mono font-bold text-[10px]">{r.entryTime || '-'}</td>
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

      {/* Non-Admin System Maintenance Overlay */}
      {isMaintenanceMode && !isAdmin && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30 mb-6 animate-pulse">
            <Wrench className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 text-white">System Maintenance Underway</h2>
          <p className="max-w-md text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
            The Admin is currently performing system maintenance and data synchronization. Logbook entry functions are temporarily locked for non-admin users to prevent record conflicts. Please stand by!
          </p>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-800/80 px-5 py-2.5 rounded-2xl shadow-xl">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Auto-syncing & checking cloud status...</span>
          </div>
        </div>
      )}

    </div>
  );
}

function AnalyticsModal({ isOpen, onClose, records: initialDailyRecords, currentDate }: { isOpen: boolean; onClose: () => void; records: RecordItem[]; currentDate: string }) {
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY' | 'YEARLY'>('DAILY');
  const [allStoreRecords, setAllStoreRecords] = useState<{ dateKey: string; records: RecordItem[] }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;

    const storeMap: Record<string, RecordItem[]> = {};

    // 1. Gather from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('philhealth_recs_')) {
        const dateKey = key.replace('philhealth_recs_', '');
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(parsed)) {
            storeMap[dateKey] = parsed;
          }
        } catch (e) {}
      }
    }

    // Always ensure current worksheet is present
    if (currentDate) {
      storeMap[currentDate] = initialDailyRecords;
    }

    const compiled = Object.entries(storeMap).map(([dateKey, recs]) => ({ dateKey, records: recs }));
    setAllStoreRecords(compiled);

    // Parse default month and year from currentDate (e.g. "SEPTEMBER 15, 2026")
    const parts = currentDate.split(' ');
    if (parts.length >= 3) {
      const yr = parts[parts.length - 1];
      const mo = parts[0];
      setSelectedMonth(`${mo} ${yr}`);
      setSelectedYear(yr);
    } else {
      const yr = new Date().getFullYear().toString();
      const mo = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
      setSelectedMonth(`${mo} ${yr}`);
      setSelectedYear(yr);
    }
  }, [isOpen, currentDate, initialDailyRecords]);

  if (!isOpen) return null;

  // Available Months list
  const availableMonths = (() => {
    const set = new Set<string>();
    allStoreRecords.forEach(item => {
      const parts = item.dateKey.split(' ');
      if (parts.length >= 3) {
        set.add(`${parts[0]} ${parts[parts.length - 1]}`);
      }
    });
    if (set.size === 0) {
      const yr = new Date().getFullYear().toString();
      const mo = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
      set.add(`${mo} ${yr}`);
    }
    return Array.from(set);
  })();

  // Available Years list
  const availableYears = (() => {
    const set = new Set<string>();
    allStoreRecords.forEach(item => {
      const parts = item.dateKey.split(' ');
      if (parts.length >= 1) {
        const yr = parts[parts.length - 1];
        if (/^\d{4}$/.test(yr)) set.add(yr);
      }
    });
    if (set.size === 0) set.add(new Date().getFullYear().toString());
    return Array.from(set);
  })();

  // Filter records based on view mode
  let activeRecords: RecordItem[] = [];
  let activeDaysCount = 1;

  if (viewMode === 'DAILY') {
    activeRecords = initialDailyRecords;
    activeDaysCount = 1;
  } else if (viewMode === 'MONTHLY') {
    const [targetMo, targetYr] = (selectedMonth || '').split(' ');
    const matching = allStoreRecords.filter(item => {
      const dk = item.dateKey.toUpperCase();
      const matchMo = targetMo ? dk.includes(targetMo) : true;
      const matchYr = targetYr ? dk.includes(targetYr) : true;
      return matchMo && matchYr;
    });
    activeDaysCount = matching.length || 1;
    activeRecords = matching.flatMap(m => m.records);
  } else if (viewMode === 'YEARLY') {
    const matching = allStoreRecords.filter(item => item.dateKey.toUpperCase().includes(selectedYear));
    activeDaysCount = matching.length || 1;
    activeRecords = matching.flatMap(m => m.records);
  }

  const categories = ['ADMISSION', 'MINOR (ER)', 'MINOR (OPD)', 'DENTAL', 'OECB', 'ANIMAL BITE', 'PAIN MANAGEMENT'];
  const total = activeRecords.length || 1;

  const phicCounts: Record<string, number> = {};
  activeRecords.forEach(r => {
    const c = r.phicCat || 'PR-M';
    phicCounts[c] = (phicCounts[c] || 0) + 1;
  });

  const icdCounts: Record<string, number> = {};
  activeRecords.forEach(r => {
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 rounded-2xl">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Logbook Analytics & Claims Summary
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Period Overview • <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {viewMode === 'DAILY' ? currentDate : viewMode === 'MONTHLY' ? selectedMonth : `Year ${selectedYear}`}
                </span>
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('DAILY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'DAILY'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MONTHLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'MONTHLY'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setViewMode('YEARLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                viewMode === 'YEARLY'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Period Filter Dropdown for Monthly / Yearly */}
        {viewMode === 'MONTHLY' && (
          <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200 dark:border-purple-800/60">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Select Month Summary:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {viewMode === 'YEARLY' && (
          <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200 dark:border-purple-800/60">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Select Year Summary:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {/* Summary Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Patients</p>
            <h4 className="text-xl md:text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
              {activeRecords.length}
            </h4>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Worksheet Days</p>
            <h4 className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {activeDaysCount} {activeDaysCount === 1 ? 'day' : 'days'}
            </h4>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Patients / Day</p>
            <h4 className="text-xl md:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
              {Math.round(activeRecords.length / Math.max(activeDaysCount, 1))}
            </h4>
          </div>
        </div>

        {/* Section Volume Breakdown Progress Bars */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Patient Volume by Section Category
          </h4>
          <div className="space-y-2">
            {categories.map(cat => {
              const count = activeRecords.filter(r => r.category === cat).length;
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
              {Object.keys(phicCounts).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No PHIC entries found.</p>
              ) : (
                Object.entries(phicCounts).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between text-xs font-semibold">
                    <span className="font-mono text-amber-600 dark:text-amber-400">{cat}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{count} patients</span>
                  </div>
                ))
              )}
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
