import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, addDoc, deleteDoc
} from 'firebase/firestore';
import {
  Plus, Search, MessageSquare, Clock, AlertCircle, CheckCircle2, XCircle, List,
  X, Pin, Trash2, Send, Edit2, Kanban, Globe2, History, Bell, LogOut, BarChart2,
  Download, Upload, Moon, Sun, ShieldAlert, UserCheck, ShieldCheck, Users,
  HardDrive, Trash, Globe, Mail, Lock, Layers, Key, Megaphone, ChevronRight,
  ChevronLeft, RefreshCw, Zap, ArrowUpDown
} from 'lucide-react';

// ============================================================================
// 1. SYSTEM CONFIGURATION & FIREBASE INITIALIZATION
// ============================================================================

const myLocalFirebaseConfig = {
  apiKey: "AIzaSyC6xIVImyXjYqtWQtdOkFlO3aBtJLGAcc8",
  authDomain: "polyglot-pm.firebaseapp.com",
  projectId: "polyglot-pm",
  storageBucket: "polyglot-pm.firebasestorage.app",
  messagingSenderId: "665653580466",
  appId: "1:665653580466:web:b72025d60f51bc3a85efab",
  measurementId: "G-RPL0YK36R7"
};

const SHEET_SYNC_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const appId = typeof __app_id !== 'undefined' ? __app_id : 'project-dashboard-v1';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myLocalFirebaseConfig;
const isConfigValid = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE";

let app, auth, db;
if (isConfigValid) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// ============================================================================
// 2. CONSTANTS & DESIGN TOKENS
// ============================================================================

const SUPER_ADMIN_EMAILS = [
  'anthonytosi@gmail.com',
  'atosi@sdl.com',
  'atosi@google.com'
];
const DEFAULT_TEAM_MEMBERS = ['Anthony', 'Andrey', 'Annika', 'Mieke', 'Emily', 'Unassigned'];
const STATUSES = ['Heads-up', 'Need Assessment', 'In Assessment', 'Screenshooting', 'In Progress', 'Blocked', 'Pending Reports', 'Completed'];
const AVAILABLE_LOCALES = ['ar-SA', 'da-DK', 'de-DE', 'en-GB', 'es-ES', 'es-419', 'it-IT', 'fr-CA', 'fr-FR', 'ja-JP', 'ko-KR', 'nl-NL', 'no-NO', 'pt-PT', 'sv-SE', 'zh-TW'];

const STATUS_COLORS = {
  'Heads-up': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', text: 'text-fuchsia-700 dark:text-fuchsia-400', border: 'border-fuchsia-200 dark:border-fuchsia-800', dot: 'bg-fuchsia-500' },
  'Need Assessment': { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  'In Assessment': { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  'Screenshooting': { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', dot: 'bg-pink-500' },
  'In Progress': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  'Blocked': { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
  'Pending Reports': { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500' },
  'Completed': { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-500' }
};

const getStatusStyle = (status) => STATUS_COLORS[status] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-500' };

const getPAColor = (paName) => {
  const PA_PALETTE = ['bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400', 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400', 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900/30 dark:text-lime-400', 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400', 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400', 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'];
  if (!paName) return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  let hash = 0;
  for (let i = 0; i < paName.length; i++) hash = paName.charCodeAt(i) + ((hash << 5) - hash);
  return PA_PALETTE[Math.abs(hash) % PA_PALETTE.length];
};

// ============================================================================
// 3. MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  // Core State
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settings, setSettings] = useState({ teamMembers: DEFAULT_TEAM_MEMBERS, allowedDomains: [], allowedUsers: [], userGroups: [], adminEmails: [] });

  // UI & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: 'All', lead: 'All', pa: 'All' });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [viewMode, setViewMode] = useState('table'); // table, kanban, metrics, admin
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Panel States
  const [selectedProject, setSelectedProject] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isAnnHistoryOpen, setIsAnnHistoryOpen] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  // Advanced Features State
  const [toasts, setToasts] = useState([]);
  const [isPulseActive, setIsPulseActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const fileInputRef = useRef(null);

  // --- Auth & Identity ---
  const currentUserEmail = user?.email?.toLowerCase() || '';
  const currentUserDisplayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentUserEmail);
  const isDelegatedAdmin = settings.adminEmails?.includes(currentUserEmail);
  const isAdmin = isSuperAdmin || isDelegatedAdmin;

  // --- Robust Access Control (Memoized for Performance) ---
  const userAccess = useMemo(() => {
    if (!user) return { hasAccess: false, role: 'none', allowedPAs: [] };
    if (isAdmin) return { hasAccess: true, role: 'admin', allowedPAs: ['all'] };

    const domain = currentUserEmail.split('@')[1] || '';
    const isDomainAllowed = settings.allowedDomains?.includes(domain);
    const isUserExplicitlyAllowed = settings.allowedUsers?.includes(currentUserEmail);
    const myGroups = settings.userGroups?.filter(g => g.members?.map(m => m?.toLowerCase() || '').includes(currentUserEmail)) || [];

    if (myGroups.length === 0 && !isDomainAllowed && !isUserExplicitlyAllowed) {
      return { hasAccess: false, role: 'none', allowedPAs: [] };
    }

    let maxRole = isDomainAllowed || isUserExplicitlyAllowed ? 'editor' : 'viewer';
    let allowedPAs = isDomainAllowed || isUserExplicitlyAllowed ? ['all'] : [];

    myGroups.forEach(g => {
      if (g.role === 'editor') maxRole = 'editor';
      if (g.scope === 'all' || allowedPAs.includes('all')) allowedPAs = ['all'];
      else allowedPAs = [...new Set([...allowedPAs, ...(g.scopedPAs || [])])];
    });

    return { hasAccess: true, role: maxRole, allowedPAs: allowedPAs };
  }, [user, settings, isAdmin, currentUserEmail]);

  const { hasAccess, role, allowedPAs } = userAccess;
  const canEdit = isAdmin || role === 'editor';

  // --- Global Toast System ---
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // --- Sync Mechanisms ---
  const triggerSheetSync = useCallback(async () => {
    if (!SHEET_SYNC_URL || SHEET_SYNC_URL.includes("PASTE_YOUR")) return;
    try { await fetch(SHEET_SYNC_URL, { method: 'POST', mode: 'no-cors' }); } catch (e) { }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await triggerSheetSync();
    setTimeout(() => { setIsRefreshing(false); addToast('System Synced Successfully', 'success'); }, 800);
  };

  useEffect(() => {
    let interval;
    if (isPulseActive && hasAccess) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { triggerSheetSync(); return 10; }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(10);
    }
    return () => clearInterval(interval);
  }, [isPulseActive, hasAccess, triggerSheetSync]);

  // --- Data Fetching Engine ---

  // 1. Initial Config Check & Auth
  useEffect(() => {
    if (!isConfigValid) { setLoading(false); return; }
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribeAuth();
  }, []);

  // 2. Fetch System Settings (Isolated from Data to prevent infinite loops)
  useEffect(() => {
    if (!user || !db) {
      setSettingsLoaded(true);
      return;
    }
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'settings', 'config');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(settingsRef, { teamMembers: DEFAULT_TEAM_MEMBERS, allowedDomains: ['google.com'], allowedUsers: [...SUPER_ADMIN_EMAILS], userGroups: [], adminEmails: [] })
          .catch(err => console.log("Init settings skipped (Insufficient permissions):", err));
      }
      setSettingsLoaded(true);
    });
    return () => unsubscribeSettings();
  }, [user]);

  // 3. Fetch Projects & Announcements (Using stable string dependencies)
  const allowedPAsString = [...allowedPAs].sort().join(',');

  useEffect(() => {
    if (!user || !db || !hasAccess || !settingsLoaded) return;

    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter logic applies before setting state
      if (allowedPAsString !== 'all') {
        const pasArray = allowedPAsString.split(',');
        data = data.filter(p => pasArray.includes(p.productArea));
      }
      setProjects(data);

      // Gracefully update the currently selected project if open
      setSelectedProject(prev => {
        if (!prev) return null;
        const updated = data.find(p => p.id === prev.id);
        return updated || prev;
      });
    });

    const annRef = collection(db, 'artifacts', appId, 'public', 'data', 'announcements');
    const unsubscribeAnn = onSnapshot(annRef, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (allowedPAsString !== 'all') {
        const pasArray = allowedPAsString.split(',');
        data = data.filter(a => a.targetPA === 'general' || pasArray.includes(a.targetPA));
      }
      data.sort((a, b) => b.timestamp - a.timestamp);
      setAnnouncements(data);
    });

    return () => { unsubscribeProjects(); unsubscribeAnn(); };
  }, [user, hasAccess, allowedPAsString, settingsLoaded]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- Derived Data & Sorting ---
  const dynamicTeamMembers = useMemo(() => {
    return [...new Set([...(settings.teamMembers || DEFAULT_TEAM_MEMBERS), currentUserDisplayName])].filter(m => m !== 'Unassigned').concat(['Unassigned']);
  }, [currentUserDisplayName, settings]);

  const uniqueProductAreas = useMemo(() => {
    return [...new Set(projects.map(p => String(p.productArea || '').trim()).filter(Boolean))].sort();
  }, [projects]);

  const allActivity = useMemo(() => {
    const act = [];
    projects.forEach(p => p.comments?.forEach(c => act.push({ ...c, projectName: p.projectName, projectId: p.id })));
    return act.sort((a, b) => b.timestamp - a.timestamp);
  }, [projects]);

  const processedProjects = useMemo(() => {
    let filtered = projects.filter(p => {
      const search = searchQuery.toLowerCase();
      // SAFEGUARDS: Ensure all strings are defined before processing to prevent TypeErrors
      const bug = (p.bugNumber || '').toLowerCase();
      const name = (p.projectName || '').toLowerCase();
      const pa = (p.productArea || '').trim();
      const lead = p.assignedLead || 'Unassigned';

      return (bug.includes(search) || name.includes(search)) &&
        (filters.status === 'All' || p.status === filters.status) &&
        (filters.lead === 'All' || lead === filters.lead) &&
        (filters.pa === 'All' || pa === filters.pa);
    });

    // Dynamic Sorting Engine
    filtered.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'clientETA' || sortConfig.key === 'createdAt') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, searchQuery, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  // --- CRUD Handlers ---
  const handleSaveProject = async (data) => {
    if (!canEdit) return;
    if (!isAdmin && allowedPAs[0] !== 'all' && !allowedPAs.includes(data.productArea)) {
      addToast("Unauthorized: You cannot save to this Product Area.", "error");
      return;
    }
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const auditData = { ...data, updatedAt: Date.now(), lastEditedBy: user.uid, lastEditedByName: currentUserDisplayName };
    try {
      if (data.id) await updateDoc(doc(ref, data.id), auditData);
      else await addDoc(ref, { ...auditData, createdAt: Date.now(), createdBy: user.uid, comments: [] });
      setIsFormOpen(false);
      triggerSheetSync();
      addToast(data.id ? "Project Updated" : "Project Created", "success");
    } catch (err) { addToast("Failed to save project", "error"); }
  };

  const handleUpdateProject = async (id, update) => {
    if (!canEdit) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id), { ...update, updatedAt: Date.now(), lastEditedByName: currentUserDisplayName });
    triggerSheetSync();
    addToast("Record updated", "success");
  };

  const handleBulkUpdate = async (field, value) => {
    if (!canEdit || selectedProjectIds.length === 0) return;
    const promises = selectedProjectIds.map(id => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id), { [field]: value, updatedAt: Date.now(), lastEditedByName: currentUserDisplayName }));
    await Promise.all(promises);
    setSelectedProjectIds([]);
    triggerSheetSync();
    addToast(`Bulk updated ${selectedProjectIds.length} projects`, "success");
  };

  const handlePostAnnouncement = async (title, content, targetPA, isPinned = false) => {
    if (!isAdmin) return;
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'announcements');
    await addDoc(ref, { title, content, targetPA, isPinned, timestamp: Date.now(), author: currentUserDisplayName, authorId: user.uid });
    addToast("Announcement Posted", "success");
  };

  const handleUpdateSettings = async (newSettings) => {
    if (!isAdmin) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'settings', 'config'), newSettings);
    addToast("Security Rules Updated", "success");
  };

  // --- CSV Import/Export ---
  const handleExportCSV = () => {
    const headers = ['Bug Number', 'Project Name', 'Product Area', 'Status', 'Assigned Lead', 'Priority', 'Client ETA', 'Tester ETA', 'Devices'];
    const rows = processedProjects.map(p => [p.bugNumber, p.projectName, p.productArea, p.status, p.assignedLead, p.priority || 'P2', p.clientETA || '', p.testerETA || '', p.devices || '']);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Polyglot_PM_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    addToast("Export generated", "success");
  };

  const parseCSVLine = (line) => {
    const vals = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
      else if (line[i] === ',' && !inQuotes) { vals.push(cur.trim()); cur = ''; }
      else cur += line[i];
    }
    vals.push(cur.trim());
    return vals.map(v => v.replace(/^"|"$/g, ''));
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !isAdmin) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);

        const ref = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
        let count = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const p = {};
          headers.forEach((h, idx) => { p[h] = values[idx] || ''; });

          if (!p['Project Name']) continue;
          await addDoc(ref, {
            bugNumber: p['Bug Number'] || '', projectName: p['Project Name'], productArea: p['Product Area'] || 'General',
            status: STATUSES.includes(p['Status']) ? p['Status'] : 'Need Assessment', assignedLead: p['Assigned Lead'] || 'Unassigned',
            priority: p['Priority'] || 'P2', clientETA: p['Client ETA'] || '', testerETA: p['Tester ETA'] || '',
            devices: p['Devices'] || '', createdAt: Date.now(), updatedAt: Date.now(), createdBy: user.uid,
            lastEditedByName: `Import: ${currentUserDisplayName}`, comments: []
          });
          count++;
        }
        addToast(`Successfully imported ${count} projects.`, "success");
        triggerSheetSync();
      } catch (err) {
        addToast("Error parsing CSV. Check format.", "error");
      }
      fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  if (loading || (user && !settingsLoaded)) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium tracking-tight">Authenticating securely...</div>;
  }

  if (!isConfigValid) return (
    <div className="flex h-screen bg-slate-50 items-center justify-center p-6">
      <div className="max-w-md bg-white p-10 rounded-[32px] shadow-2xl border border-slate-200 text-center">
        <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-slate-900 mb-3">Database Setup Required</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">Your application needs Firebase credentials to connect to the database. Please update <b>App.jsx</b> line 17.</p>
      </div>
    </div>
  );

  if (user && !hasAccess) return (
    <div className="flex h-screen bg-slate-50 items-center justify-center font-sans p-6">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 flex flex-col items-center max-w-md w-full text-center">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mb-8"><Lock size={40} /></div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">Access Restricted</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">Your address (<b>{currentUserEmail}</b>) is not on the access control list.</p>
        <button onClick={() => signOut(auth)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"><LogOut size={18} /> Sign Out</button>
      </div>
    </div>
  );

  if (!user) return (
    <div className="flex h-screen bg-slate-50 items-center justify-center font-sans">
      <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-slate-100 flex flex-col items-center max-w-md w-full text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/30 mb-8 text-4xl">P</div>
        <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Polyglot PM</h1>
        <p className="text-slate-500 mb-10 font-medium">Enterprise Localization Management</p>
        <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="flex items-center justify-center gap-4 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 text-slate-800 font-black py-4 px-6 rounded-2xl w-full transition-all active:scale-95 shadow-sm">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-5 h-5" alt="Google" /> Sign in with Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">

      {/* GLOBAL TOAST CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl font-black text-sm uppercase tracking-widest animate-in slide-in-from-right-8 fade-in ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
            {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {t.message}
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <div className="w-24 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-8 z-10 justify-between transition-colors">
        <div className="flex flex-col items-center gap-8 w-full">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30 cursor-pointer hover:rotate-12 transition-transform" onClick={() => setViewMode('table')}>P</div>
          <nav className="flex flex-col gap-4 w-full px-4">
            <SidebarBtn icon={List} active={viewMode === 'table'} onClick={() => setViewMode('table')} label="Table" />
            <SidebarBtn icon={Kanban} active={viewMode === 'kanban'} onClick={() => setViewMode('kanban')} label="Board" />
            <SidebarBtn icon={BarChart2} active={viewMode === 'metrics'} onClick={() => setViewMode('metrics')} label="Stats" />
            {isAdmin && <SidebarBtn icon={ShieldCheck} active={viewMode === 'admin'} onClick={() => setViewMode('admin')} label="Admin" highlight />}
          </nav>
        </div>
        <div className="flex flex-col items-center gap-6">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">{isDarkMode ? <Sun size={22} /> : <Moon size={22} />}</button>
          <button onClick={() => signOut(auth)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"><LogOut size={22} /></button>
          <div className="relative group mt-2">
            <div className="w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-sm font-black text-white bg-indigo-600 shadow-md">
              {currentUserDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* TOP HEADER */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-10 py-6 flex items-center justify-between z-10 transition-colors">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight">{viewMode === 'admin' ? 'System Controls' : 'Project Directory'}</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Role: {isAdmin ? 'System Admin' : role} {allowedPAs[0] !== 'all' && `• Scoped (${allowedPAs.length})`}</p>
            </div>

            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-colors ${isPulseActive ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
              <div className={`w-2 h-2 rounded-full ${isPulseActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isPulseActive ? 'text-green-700 dark:text-green-400' : 'text-slate-500'}`}>{isPulseActive ? `Live Pulse: ${countdown}s` : 'Pulse: Off'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {viewMode !== 'admin' && (
              <>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Search entries..." className="pl-12 pr-6 py-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-medium w-72 outline-none focus:ring-2 ring-indigo-500/30 transition-all placeholder:text-slate-400 dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                  <ActionBtn icon={RefreshCw} onClick={handleManualRefresh} active={isRefreshing} title="Force Sync Refresh" />
                  {isAdmin && <ActionBtn icon={Zap} onClick={() => setIsPulseActive(!isPulseActive)} active={isPulseActive} color="amber" title="Toggle 10s Auto-Pulse" />}
                  <ActionBtn icon={History} onClick={() => setIsActivityOpen(true)} title="Global Audit Log" />
                  <ActionBtn icon={Download} onClick={handleExportCSV} title="Export CSV" />
                  {isAdmin && (
                    <>
                      <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleImportCSV} />
                      <ActionBtn icon={Upload} onClick={() => fileInputRef.current.click()} title="Bulk Import CSV" />
                    </>
                  )}
                </div>

                {canEdit && (
                  <button onClick={() => { setSelectedProject(null); setIsFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 ml-2">
                    <Plus size={20} /> New Record
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {/* ANNOUNCEMENT TICKER */}
        {announcements.length > 0 && viewMode !== 'admin' && (
          <AnnouncementBar announcements={announcements} onOpenHistory={() => setIsAnnHistoryOpen(true)} />
        )}

        {/* FILTER BAR (Table & Kanban only) */}
        {viewMode !== 'admin' && viewMode !== 'metrics' && (
          <div className="px-10 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-0">
            <div className="flex gap-4">
              <FilterSelect value={filters.status} onChange={v => setFilters({ ...filters, status: v })} options={STATUSES} label="All Statuses" />
              <FilterSelect value={filters.lead} onChange={v => setFilters({ ...filters, lead: v })} options={dynamicTeamMembers} label="All Leads" />
              <FilterSelect value={filters.pa} onChange={v => setFilters({ ...filters, pa: v })} options={uniqueProductAreas} label="All Areas" />
            </div>

            {selectedProjectIds.length > 0 && canEdit && (
              <div className="bg-indigo-600 text-white px-6 py-2 rounded-xl flex items-center gap-6 animate-in slide-in-from-bottom-2">
                <span className="text-[10px] font-black uppercase tracking-widest">{selectedProjectIds.length} Selected</span>
                <div className="flex gap-3">
                  <select onChange={(e) => handleBulkUpdate('status', e.target.value)} className="bg-white/20 text-white border-none text-[10px] font-black py-1 px-3 rounded-lg outline-none cursor-pointer appearance-none"><option value="">Batch Status...</option>{STATUSES.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}</select>
                  <select onChange={(e) => handleBulkUpdate('assignedLead', e.target.value)} className="bg-white/20 text-white border-none text-[10px] font-black py-1 px-3 rounded-lg outline-none cursor-pointer appearance-none"><option value="">Batch Lead...</option>{dynamicTeamMembers.map(m => <option key={m} value={m} className="text-slate-900">{m}</option>)}</select>
                  <button onClick={() => setSelectedProjectIds([])} className="p-1 hover:bg-white/20 rounded-lg"><X size={14} /></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DYNAMIC SCROLLING VIEW */}
        <div className="flex-1 overflow-auto p-10 bg-slate-50 dark:bg-slate-950">
          {viewMode === 'table' && <TableView projects={processedProjects} selectedIds={selectedProjectIds} onSelect={setSelectedProjectIds} onOpen={setSelectedProject} onUpdateProject={handleUpdateProject} canEdit={canEdit} sortConfig={sortConfig} onSort={handleSort} />}
          {viewMode === 'kanban' && <div className="flex gap-8 pb-10 min-h-full">{STATUSES.map(s => <KanbanColumn key={s} status={s} projects={processedProjects.filter(p => p.status === s)} onOpen={setSelectedProject} />)}</div>}
          {viewMode === 'metrics' && <MetricsView projects={projects} />}
          {viewMode === 'admin' && isAdmin && (
            <AdminView
              settings={settings} onUpdateSettings={handleUpdateSettings} productAreas={uniqueProductAreas}
              isSuperAdmin={isSuperAdmin} onPostAnnouncement={handlePostAnnouncement} announcements={announcements}
              onDeleteAnnouncement={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id))}
              onTogglePin={(id, val) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id), { isPinned: !val })}
            />
          )}
        </div>
      </div>

      {/* SLIDE-OVER PANELS */}
      {isAnnHistoryOpen && <AnnouncementHistory announcements={announcements} onClose={() => setIsAnnHistoryOpen(false)} />}
      {isActivityOpen && <ActivityFeed activities={allActivity} onClose={() => setIsActivityOpen(false)} onOpen={(id) => { setSelectedProject(projects.find(p => p.id === id)); setIsActivityOpen(false); }} />}
      {isFormOpen && <ProjectForm project={selectedProject} teamMembers={dynamicTeamMembers} uniquePAs={uniqueProductAreas} onClose={() => { setIsFormOpen(false); setSelectedProject(null); }} onSave={handleSaveProject} />}
      {selectedProject && !isFormOpen && (
        <ProjectDetails
          project={selectedProject} isAdmin={isAdmin} canEdit={canEdit}
          onClose={() => setSelectedProject(null)} onEdit={() => setIsFormOpen(true)}
          onUpdate={handleUpdateProject}
          onDelete={(id) => { deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id)); triggerSheetSync(); setSelectedProject(null); addToast("Project Deleted", "success"); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// 4. PURE UI SUBCOMPONENTS
// ============================================================================

// --- Helper Buttons & Inputs ---
const SidebarBtn = ({ icon: Icon, active, onClick, label, highlight }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl w-full flex justify-center transition-all duration-200 ${active ? (highlight ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400') : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`} title={label}>
    <Icon size={24} className={active && highlight ? 'drop-shadow-sm' : ''} />
  </button>
);

const ActionBtn = ({ icon: Icon, onClick, active, color = 'indigo', title }) => {
  const activeClass = active ? (color === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30') : '';
  const spinClass = active && color === 'indigo' ? 'animate-spin' : '';
  return (
    <button onClick={onClick} title={title} className={`p-3 rounded-xl transition-all text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 ${activeClass}`}>
      <Icon size={20} className={spinClass} />
    </button>
  );
};

const FilterSelect = ({ value, onChange, options, label }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)} className="appearance-none pl-4 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
      <option value="All">{label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <ArrowUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
);

const SortIcon = ({ sortConfig, col }) => (
  <span className={`ml-2 inline-block transition-transform ${sortConfig.key === col ? 'text-indigo-500' : 'text-slate-300'} ${sortConfig.key === col && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}>↑</span>
);

const RenderList = ({ items, listKey, icon: Icon, color, disableRemove, onRemove }) => (
  <div className="flex flex-wrap gap-2 mt-4">
    {items.map(item => (
      <div key={item} className={`flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest`}>
        {Icon && <Icon size={12} className={`text-${color}-500`} />} {item}
        {!disableRemove && <button onClick={() => onRemove(listKey, item)} className="ml-2 text-slate-300 hover:text-red-500"><X size={14} /></button>}
      </div>
    ))}
    {items.length === 0 && <span className="text-[10px] font-bold text-slate-400 italic">List is empty.</span>}
  </div>
);


// --- Major Views ---
function AnnouncementBar({ announcements, onOpenHistory }) {
  const [index, setIndex] = useState(0);
  const displayList = useMemo(() => [...announcements.filter(a => a.isPinned), ...announcements.filter(a => !a.isPinned).slice(0, 3)], [announcements]);
  const current = displayList[index % displayList.length];

  if (!current) return null;
  return (
    <div className={`px-10 py-3 flex items-center justify-between border-b transition-colors ${current.isPinned ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-indigo-600 border-indigo-700 text-white'}`}>
      <div className="flex items-center gap-6 overflow-hidden">
        <div className={`flex items-center gap-2 flex-shrink-0 font-black text-[10px] uppercase tracking-widest ${current.isPinned ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-200'}`}>
          <Megaphone size={16} /> {current.isPinned ? 'Priority Pin' : 'Updates'}
        </div>
        <div className={`text-sm font-bold truncate ${current.isPinned ? 'text-slate-900 dark:text-amber-100' : 'text-white'}`}>
          <span className="opacity-60 font-black mr-3 px-2 py-0.5 rounded border border-current">QA: {current.targetPA || 'GENERAL'}</span>
          {current.title}: <span className="font-medium opacity-90">{current.content}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-6 flex-shrink-0">
        <div className="flex gap-1">
          <button onClick={() => setIndex(p => p > 0 ? p - 1 : displayList.length - 1)} className="p-1 hover:bg-black/10 rounded"><ChevronLeft size={16} /></button>
          <button onClick={() => setIndex(p => p + 1)} className="p-1 hover:bg-black/10 rounded"><ChevronRight size={16} /></button>
        </div>
        <button onClick={onOpenHistory} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${current.isPinned ? 'border-amber-300 text-amber-700 bg-white hover:bg-amber-100 dark:bg-transparent dark:text-amber-400' : 'border-indigo-400 text-white bg-indigo-500/50 hover:bg-indigo-500'}`}>Log</button>
      </div>
    </div>
  );
}

function TableView({ projects, selectedIds, onSelect, onOpen, onUpdateProject, canEdit, sortConfig, onSort }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-black tracking-widest">
          <tr>
            <th className="px-8 py-5 w-10">
              {canEdit && <input type="checkbox" className="rounded bg-slate-200 border-none cursor-pointer" checked={projects.length > 0 && selectedIds.length === projects.length} onChange={() => onSelect(selectedIds.length ? [] : projects.map(p => p.id))} />}
            </th>
            <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => onSort('projectName')}>Project Specs <SortIcon sortConfig={sortConfig} col="projectName" /></th>
            <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => onSort('status')}>Current Phase <SortIcon sortConfig={sortConfig} col="status" /></th>
            <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => onSort('assignedLead')}>Assigned <SortIcon sortConfig={sortConfig} col="assignedLead" /></th>
            <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors" onClick={() => onSort('clientETA')}>Schedule <SortIcon sortConfig={sortConfig} col="clientETA" /></th>
            <th className="px-8 py-5 text-center">Deliverables</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {projects.map(p => {
            const style = getStatusStyle(p.status);
            const isSelected = selectedIds.includes(p.id);
            return (
              <tr key={p.id} className={`group cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'}`} onClick={() => onOpen(p)}>
                <td className="px-8 py-6" onClick={e => { e.stopPropagation(); if (canEdit) onSelect(prev => isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id]); }}>
                  {canEdit && <input type="checkbox" checked={isSelected} readOnly className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer" />}
                </td>
                <td className="px-8 py-6">
                  <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-black mb-1.5 uppercase tracking-widest">{p.bugNumber || 'DRAFT'}</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-2.5 leading-tight">{p.projectName}</div>
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-tighter ${getPAColor(p.productArea)}`}>{p.productArea || 'General'}</span>
                </td>
                <td className="px-8 py-6"><span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black border ${style.bg} ${style.text} ${style.border}`}><span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>{p.status}</span></td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400">{p.assignedLead?.charAt(0)}</div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.assignedLead}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2"><Clock size={12} className="text-slate-300" /> <span className={p.clientETA ? 'text-slate-700 dark:text-slate-200' : ''}>Client: {p.clientETA || 'TBD'}</span></div>
                    <div className="flex items-center gap-2"><Clock size={12} className="opacity-40" /> <span className="opacity-70">Tester: {p.testerETA || 'TBD'}</span></div>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="flex justify-center gap-3">
                    <button onClick={e => { e.stopPropagation(); if (canEdit) onUpdateProject(p.id, { quoteReady: !p.quoteReady }); }} className={`p-2 rounded-xl border transition-all ${p.quoteReady ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'text-slate-300 border-slate-100 dark:border-slate-700 hover:border-slate-300'}`} title="Quote Ready"><CheckCircle2 size={16} /></button>
                    <button onClick={e => { e.stopPropagation(); if (canEdit) onUpdateProject(p.id, { quoteSent: !p.quoteSent }); }} className={`p-2 rounded-xl border transition-all ${p.quoteSent ? 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'text-slate-300 border-slate-100 dark:border-slate-700 hover:border-slate-300'}`} title="Quote Sent"><Send size={16} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
          {projects.length === 0 && <tr><td colSpan="6" className="px-8 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No matching records found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function KanbanColumn({ status, projects, onOpen }) {
  const style = getStatusStyle(status);
  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      <div className="flex items-center justify-between mb-6 px-2">
        <span className="flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"><span className={`w-2 h-2 rounded-full ${style.dot} shadow-sm`}></span>{status}</span>
        <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg text-[9px] font-black">{projects.length}</span>
      </div>
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4">
        {projects.map(p => (
          <div key={p.id} onClick={() => onOpen(p)} className="group bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md uppercase tracking-wider">{p.bugNumber || 'Draft'}</div>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-5 leading-snug">{p.projectName}</div>
            <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-700/50 pt-4 mt-auto">
              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-tighter ${getPAColor(p.productArea)}`}>{p.productArea || 'General'}</span>
              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400">{p.assignedLead?.charAt(0)}</div>
            </div>
          </div>
        ))}
        {projects.length === 0 && <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] h-32 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Empty</div>}
      </div>
    </div>
  );
}

function MetricsView({ projects }) {
  const getPercentage = (count) => projects.length ? Math.round((count / projects.length) * 100) : 0;
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white dark:bg-slate-800 p-12 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-10 flex items-center gap-3"><BarChart2 size={20} /> Phase Distribution Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
          {STATUSES.map(s => {
            const count = projects.filter(p => p.status === s).length;
            if (!count) return null;
            return (
              <div key={s} className="space-y-3">
                <div className="flex justify-between items-end text-xs font-black uppercase tracking-tight">
                  <span className="text-slate-700 dark:text-slate-200">{s}</span>
                  <span className="text-slate-400 text-[10px]">{count} Records ({getPercentage(count)}%)</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner p-0.5">
                  <div className={`h-full rounded-full ${getStatusStyle(s).dot} transition-all duration-1000 shadow-sm`} style={{ width: `${getPercentage(count)}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminView({ settings, onUpdateSettings, productAreas, isSuperAdmin, onPostAnnouncement, announcements, onDeleteAnnouncement, onTogglePin }) {
  const [newGroup, setNewGroup] = useState({ name: '', role: 'viewer', scope: 'all', scopedPAs: [], members: [] });
  const [inputs, setInputs] = useState({ admin: '', user: '', domain: '', annTitle: '', annContent: '', annTarget: 'general' });

  const updateSettingList = (key, value) => {
    if (!value.trim()) return;
    const cleanValue = value.toLowerCase().trim().replace('@', '');
    onUpdateSettings({ ...settings, [key]: [...new Set([...(settings[key] || []), cleanValue])] });
    setInputs(p => ({ ...p, [key === 'adminEmails' ? 'admin' : key === 'allowedUsers' ? 'user' : 'domain']: '' }));
  };

  const removeSettingItem = (key, value) => {
    onUpdateSettings({ ...settings, [key]: settings[key].filter(x => x !== value) });
  };

  const addGroup = () => {
    if (!newGroup.name.trim()) return;
    onUpdateSettings({ ...settings, userGroups: [...(settings.userGroups || []), { ...newGroup, id: Date.now() }] });
    setNewGroup({ name: '', role: 'viewer', scope: 'all', scopedPAs: [], members: [] });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-500">

      {/* Comms */}
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-xl">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3"><Megaphone className="text-indigo-500" /> Broadcast Engine</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <input className="p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20" value={inputs.annTitle} onChange={e => setInputs({ ...inputs, annTitle: e.target.value })} placeholder="Headline Subject..." />
          <select className="p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold uppercase tracking-wider outline-none" value={inputs.annTarget} onChange={e => setInputs({ ...inputs, annTarget: e.target.value })}>
            <option value="general">Target: Global Access</option>
            {productAreas.map(pa => <option key={pa} value={pa}>Target PA: {pa}</option>)}
          </select>
        </div>
        <textarea className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-medium mb-6 min-h-[120px] outline-none focus:ring-2 ring-indigo-500/20" value={inputs.annContent} onChange={e => setInputs({ ...inputs, annContent: e.target.value })} placeholder="Message content..." />
        <button onClick={() => { onPostAnnouncement(inputs.annTitle, inputs.annContent, inputs.annTarget); setInputs({ ...inputs, annTitle: '', annContent: '' }); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs transition-colors shadow-lg shadow-indigo-500/20">Publish Broadcast</button>

        <div className="mt-12 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-8">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Active & Historical Broadcasts</h4>
          {announcements.map(ann => (
            <div key={ann.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-colors ${ann.isPinned ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
              <div className="flex gap-5 items-center overflow-hidden">
                <button onClick={() => onTogglePin(ann.id, ann.isPinned)} className={`p-2 rounded-xl border transition-all ${ann.isPinned ? 'text-amber-600 bg-amber-100 border-amber-300' : 'text-slate-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}><Pin size={16} /></button>
                <div className="truncate">
                  <div className="text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-1">{ann.targetPA}</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{ann.title}</div>
                </div>
              </div>
              <button onClick={() => onDeleteAnnouncement(ann.id)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash size={18} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Security Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-xl col-span-1 lg:col-span-3">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3"><ShieldCheck className="text-amber-500" /> Core Security Keys</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Admins */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">System Admins</label>
              <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold outline-none mb-2" value={inputs.admin} onChange={e => setInputs({ ...inputs, admin: e.target.value })} onKeyDown={e => e.key === 'Enter' && updateSettingList('adminEmails', inputs.admin)} placeholder="Add admin email..." />
              <div className="flex flex-wrap gap-2 mt-4">
                {SUPER_ADMIN_EMAILS.map(email => (
                  <div key={email} className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">
                    <Key size={12} /> {email}
                  </div>
                ))}
              </div>
              <RenderList items={settings.adminEmails || []} listKey="adminEmails" onRemove={removeSettingItem} />
            </div>
            {/* Domains */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Whitelist Domains</label>
              <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold outline-none mb-2" value={inputs.domain} onChange={e => setInputs({ ...inputs, domain: e.target.value })} onKeyDown={e => e.key === 'Enter' && updateSettingList('allowedDomains', inputs.domain)} placeholder="e.g. company.com..." />
              <RenderList items={settings.allowedDomains || []} listKey="allowedDomains" icon={Globe} color="blue" onRemove={removeSettingItem} />
            </div>
            {/* Users */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Whitelist Emails</label>
              <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold outline-none mb-2" value={inputs.user} onChange={e => setInputs({ ...inputs, user: e.target.value })} onKeyDown={e => e.key === 'Enter' && updateSettingList('allowedUsers', inputs.user)} placeholder="Specific user email..." />
              <RenderList items={settings.allowedUsers || []} listKey="allowedUsers" icon={Mail} color="emerald" onRemove={removeSettingItem} />
            </div>
          </div>
        </div>
      </div>

      {/* Group Creator */}
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-xl">
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3"><Layers className="text-indigo-500" /> Define Access Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Matrix Name</label><input className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold outline-none" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="e.g. Vendors" /></div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Permissions</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold outline-none" value={newGroup.role} onChange={e => setNewGroup({ ...newGroup, role: e.target.value })}><option value="viewer">Read Only Viewer</option><option value="editor">Full Editor</option></select></div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Scope Horizon</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold outline-none" value={newGroup.scope} onChange={e => setNewGroup({ ...newGroup, scope: e.target.value })}><option value="all">Global Access</option><option value="scoped">Restricted Silos</option></select></div>
          <button onClick={addGroup} className="bg-indigo-600 text-white h-[52px] rounded-2xl font-black text-xs shadow-lg shadow-indigo-500/20">Construct Matrix</button>
        </div>
        {newGroup.scope === 'scoped' && (
          <div className="mt-8 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
            {productAreas.map(pa => {
              const isSel = newGroup.scopedPAs.includes(pa);
              return <button key={pa} onClick={() => setNewGroup({ ...newGroup, scopedPAs: isSel ? newGroup.scopedPAs.filter(x => x !== pa) : [...newGroup.scopedPAs, pa] })} className={`px-5 py-2.5 rounded-xl text-[10px] font-black border uppercase tracking-widest transition-all ${isSel ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}>{pa}</button>
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(settings.userGroups || []).map(group => (
          <div key={group.id} className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{group.name}</h4>
                <div className="flex gap-3">
                  <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">{group.role}</span>
                  <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">{group.scope === 'all' ? 'Global' : `Scoped: ${group.scopedPAs?.length || 0}`}</span>
                </div>
              </div>
              <button onClick={() => onUpdateSettings({ ...settings, userGroups: settings.userGroups.filter(g => g.id !== group.id) })} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"><Trash size={18} /></button>
            </div>
            <div className="mt-auto">
              <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold outline-none mb-4 focus:ring-2 ring-indigo-500/20" placeholder="Type email and press Enter..." onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value) {
                  const newGroups = settings.userGroups.map(g => g.id === group.id ? { ...g, members: [...new Set([...(g.members || []), e.target.value.toLowerCase().trim()])] } : g);
                  onUpdateSettings({ ...settings, userGroups: newGroups });
                  e.target.value = '';
                }
              }} />
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {group.members?.map(m => (
                  <div key={m} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300">{m}<button onClick={() => onUpdateSettings({ ...settings, userGroups: settings.userGroups.map(g => g.id === group.id ? { ...g, members: g.members.filter(x => x !== m) } : g) })} className="hover:text-red-500"><X size={12} /></button></div>
                ))}
                {(!group.members || group.members.length === 0) && <span className="text-xs text-slate-400 font-medium italic">No identities mapped.</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Modals & Panels ---

function AnnouncementHistory({ announcements, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-[500px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-200 dark:border-slate-800">
        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
          <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 dark:text-white"><Megaphone size={24} className="text-indigo-600" /> Comm Log</h2>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 p-10 overflow-y-auto space-y-8">
          {announcements.map(ann => (
            <div key={ann.id} className={`p-8 rounded-[32px] border transition-all ${ann.isPinned ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/50 shadow-lg shadow-amber-500/5' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${ann.isPinned ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white dark:bg-slate-900 text-indigo-600 border-indigo-100 dark:border-slate-700'}`}>{ann.targetPA || 'GENERAL'}</span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(ann.timestamp).toLocaleDateString()}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 leading-snug">{ann.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{ann.content}</p>
              <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">{ann.author?.charAt(0)}</div> {ann.author}
              </div>
            </div>
          ))}
          {announcements.length === 0 && <div className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-xs">No records exist</div>}
        </div>
      </div>
    </div>
  );
}

function ProjectForm({ project, onClose, onSave, teamMembers, uniquePAs }) {
  const [data, setData] = useState(project || { bugNumber: '', projectName: '', productArea: '', assignedLead: 'Unassigned', status: 'Need Assessment', priority: 'P2', clientETA: '', testerETA: '', projectFolderUrl: '', quoteUrl: '' });
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-[500px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-200 dark:border-slate-800">
        <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{project ? 'Update Entry' : 'New Entry'}</h2>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 p-10 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Bug ID</label><input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" value={data.bugNumber} onChange={e => setData({ ...data, bugNumber: e.target.value })} placeholder="b/..." /></div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Product Area</label><input list="pa-list" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" value={data.productArea} onChange={e => setData({ ...data, productArea: e.target.value })} placeholder="e.g. Search" /><datalist id="pa-list">{uniquePAs.map(pa => <option key={pa} value={pa} />)}</datalist></div>
          </div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Project Descriptor</label><input className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" value={data.projectName} onChange={e => setData({ ...data, projectName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-6">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Assignment</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none dark:text-white" value={data.assignedLead} onChange={e => setData({ ...data, assignedLead: e.target.value })}>{teamMembers.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Phase</label><select className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none dark:text-white" value={data.status} onChange={e => setData({ ...data, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Client Target</label><input type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none dark:text-white" value={data.clientETA} onChange={e => setData({ ...data, clientETA: e.target.value })} /></div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tester Target</label><input type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none dark:text-white" value={data.testerETA} onChange={e => setData({ ...data, testerETA: e.target.value })} /></div>
          </div>
        </div>
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-4 text-slate-500 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">Cancel</button>
          <button onClick={() => onSave(data)} disabled={!data.projectName} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Save to Database</button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetails({ project, onClose, onEdit, onUpdate, isAdmin, canEdit, onDelete }) {
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-[600px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-200 dark:border-slate-800">
        <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 relative">
          <button onClick={onClose} className="absolute top-8 right-8 p-3 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
          <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 inline-block px-3 py-1 rounded-lg">{project.bugNumber || 'DRAFT'}</div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight">{project.projectName}</h2>
          <div className="flex items-center gap-4 mb-8">
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${getPAColor(project.productArea)}`}>{project.productArea || 'General'}</span>
            <span className="text-xs text-slate-400 font-bold flex items-center gap-2"><div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] flex items-center justify-center text-slate-600 dark:text-slate-300">{project.assignedLead?.charAt(0)}</div>{project.assignedLead}</span>
          </div>
          <div className="flex gap-4 items-center">
            {canEdit && <button onClick={onEdit} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-all"><Edit2 size={16} /> Edit Entry</button>}
            <span className={`px-6 py-3 rounded-2xl text-xs font-black border flex items-center gap-2 ${getStatusStyle(project.status).bg} ${getStatusStyle(project.status).text} ${getStatusStyle(project.status).border}`}><span className={`w-2 h-2 rounded-full ${getStatusStyle(project.status).dot}`}></span>{project.status}</span>
            {isAdmin && <button onClick={() => onDelete(project.id)} className="ml-auto p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"><Trash2 size={20} /></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-10 space-y-12">

          <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client ETA</div><div className="text-sm font-bold dark:text-white flex items-center gap-2"><Clock size={14} className="text-indigo-500" /> {project.clientETA || '--'}</div></div>
            <div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tester ETA</div><div className="text-sm font-bold dark:text-white flex items-center gap-2"><Clock size={14} className="text-indigo-500" /> {project.testerETA || '--'}</div></div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2.5"><Globe2 size={16} className="text-indigo-600" /> Locale Footprint Matrix</h3>
            <div className="grid grid-cols-3 gap-3">
              {AVAILABLE_LOCALES.map(loc => {
                const current = project.locales?.find(l => l.name === loc);
                return (
                  <button key={loc} disabled={!canEdit} onClick={() => {
                    const next = current?.status === 'Passed' ? 'Failed' : current?.status === 'Failed' ? 'Pending' : 'Passed';
                    const list = current ? project.locales.map(l => l.name === loc ? { ...l, status: next } : l) : [...(project.locales || []), { name: loc, status: 'Passed' }];
                    onUpdate(project.id, { locales: list });
                  }} className={`text-center py-4 px-2 rounded-2xl border text-[10px] font-black transition-all ${current?.status === 'Passed' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : current?.status === 'Failed' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-indigo-300'}`}>
                    <div className="mb-1 text-xs">{loc}</div>
                    <div className="opacity-60">{current?.status || 'N/A'}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2.5"><MessageSquare size={16} className="text-indigo-600" /> Audit & Comm Log</h3>
            <div className="flex gap-3">
              <input className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20 dark:text-white" value={comment} onChange={e => setComment(e.target.value)} placeholder="Append secure note..." onKeyDown={e => { if (e.key === 'Enter' && comment) { onUpdate(project.id, { comments: [...(project.comments || []), { id: Date.now(), author: currentUserDisplayName, text: comment, timestamp: Date.now() }] }); setComment(''); } }} />
              <button onClick={() => { if (comment) { onUpdate(project.id, { comments: [...(project.comments || []), { id: Date.now(), author: currentUserDisplayName, text: comment, timestamp: Date.now() }] }); setComment(''); } }} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"><Send size={20} /></button>
            </div>
            <div className="space-y-4">
              {(project.comments || []).slice().reverse().map(c => (
                <div key={c.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <span className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] flex items-center justify-center text-slate-600 dark:text-slate-300">{c.author?.charAt(0)}</div>{c.author}</span>
                    <span>{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{c.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ activities, onClose, onOpen }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-[450px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100 dark:border-slate-800">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
          <h2 className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white"><History size={22} className="text-indigo-600" /> Global Audit Trail</h2>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="flex-1 p-8 overflow-y-auto space-y-8 relative">
          <div className="absolute left-[39px] top-8 bottom-8 w-px bg-slate-200 dark:bg-slate-800"></div>
          {activities.map(act => (
            <div key={act.id} className="relative pl-12 cursor-pointer group" onClick={() => onOpen(act.projectId)}>
              <div className="absolute left-[3px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900 transition-transform group-hover:scale-150"></div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 group-hover:border-indigo-300 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{act.projectName}</div>
                  <div className="text-[9px] font-bold text-slate-400">{new Date(act.timestamp).toLocaleDateString()}</div>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 mb-3 font-medium line-clamp-3">{act.text}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">{act.author?.charAt(0)}</div> Logged by {act.author}
                </div>
              </div>
            </div>
          ))}
          {activities.length === 0 && <div className="text-center text-slate-400 font-black py-20 uppercase tracking-widest text-[10px]">Trail is currently empty</div>}
        </div>
      </div>
    </div>
  );
}