import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, addDoc, deleteDoc
} from 'firebase/firestore';
import {
  Plus, Search, MessageSquare, Star, Clock, AlertCircle,
  CheckCircle2, XCircle, LayoutGrid, List, FileSpreadsheet,
  X, Pin, Trash2, Send, Edit2, Kanban, Globe2,
  ExternalLink, Folder, FileText, History, Bell, LogOut,
  BarChart2, Download, Copy, Moon, Sun, CheckSquare
} from 'lucide-react';

// --- Firebase Initialization (Rule 1 & 3 compliance) ---
// 🚨 IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION HERE 🚨
const myLocalFirebaseConfig = {
  apiKey: "AIzaSyC6xIVImyXjYqtWQtdOkFlO3aBtJLGAcc8",
  authDomain: "polyglot-pm.firebaseapp.com",
  projectId: "polyglot-pm",
  storageBucket: "polyglot-pm.firebasestorage.app",
  messagingSenderId: "665653580466",
  appId: "1:665653580466:web:b72025d60f51bc3a85efab",
  measurementId: "G-RPL0YK36R7"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : myLocalFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'project-dashboard-v1';

// --- Constants ---
const TEAM_MEMBERS = ['Anthony', 'Andrey', 'Annika', 'Mieke', 'Emily', 'Unassigned'];
const PRIORITIES = [
  { id: 'P0', label: 'P0 - Most Urgent', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'P1', label: 'P1 - Urgent', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'P2', label: 'P2 - Standard', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'P3', label: 'P3 - Completed', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'P4', label: 'P4 - On Hold', color: 'bg-gray-100 text-gray-800 border-gray-200' }
];
const STATUSES = [
  'Heads-up', 'Need Assessment', 'In Assessment', 'Screenshooting',
  'In Progress', 'Blocked', 'Pending Reports', 'Completed'
];
const AVAILABLE_LOCALES = [
  'ar-SA', 'da-DK', 'de-DE', 'en-GB', 'es-ES', 'es-419', 'it-IT',
  'fr-CA', 'fr-FR', 'ja-JP', 'ko-KR', 'nl-NL', 'no-NO', 'pt-PT',
  'sv-SE', 'zh-TW'
];

// --- New Color Helpers ---
const STATUS_COLORS = {
  'Heads-up': { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-400', border: 'border-fuchsia-200 dark:border-fuchsia-800', dot: 'bg-fuchsia-500' },
  'Need Assessment': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  'In Assessment': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  'Screenshooting': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', dot: 'bg-pink-500' },
  'In Progress': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  'Blocked': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
  'Pending Reports': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500' },
  'Completed': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-500' }
};
const getStatusStyle = (status) => STATUS_COLORS[status] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-500' };

const PA_PALETTE = [
  'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
  'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900/30 dark:text-lime-400 dark:border-lime-800',
  'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
  'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
];
const getPAColor = (paName) => {
  if (!paName) return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let hash = 0;
  for (let i = 0; i < paName.length; i++) hash = paName.charCodeAt(i) + ((hash << 5) - hash);
  return PA_PALETTE[Math.abs(hash) % PA_PALETTE.length];
};

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [authError, setAuthError] = useState('');

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [leadFilter, setLeadFilter] = useState('All');
  const [productAreaFilter, setProductAreaFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // New States for Advanced Features
  const [viewMode, setViewMode] = useState('table'); // 'table', 'kanban', or 'metrics'
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Dynamic User Profile Data
  const currentUserDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Canvas User';
  // Give Canvas User admin rights so you can test deletion in the preview environment
  const isAdmin = currentUserDisplayName.toLowerCase().includes('anthony') || currentUserDisplayName === 'Canvas User';

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // RULE 1: Strict paths for team shared data
    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');

    // RULE 2: Simple query, all filtering done client-side
    const unsubscribe = onSnapshot(projectsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation date descending
      data.sort((a, b) => b.createdAt - a.createdAt);
      setProjects(data);
      setLoading(false);

      // Update selected project if it's currently open to see live comment updates
      if (selectedProject) {
        const updated = data.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    const notifRef = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');
    const unsubscribeNotifs = onSnapshot(notifRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);
    });

    return () => {
      unsubscribe();
      unsubscribeNotifs();
    };
  }, [user, selectedProject]);

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- Derived Data (Filtering & Sorting in memory) ---
  const dynamicTeamMembers = useMemo(() => {
    // Automatically add the logged-in Google User to the Lead dropdown list if they aren't there
    const members = new Set([...TEAM_MEMBERS, currentUserDisplayName]);
    members.delete('Unassigned');
    members.delete('Canvas User');
    return [...Array.from(members), 'Unassigned'];
  }, [currentUserDisplayName]);

  const myNotifications = useMemo(() => {
    // 1. Get database notifications (Mentions, Assignments)
    const dbNotifs = notifications.filter(n => n.recipient === currentUserDisplayName && !n.read);

    // 2. Dynamically calculate deadline notifications in memory
    const deadlineNotifs = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    projects.forEach(p => {
      if (p.assignedLead === currentUserDisplayName && p.status !== 'Completed' && p.status !== 'Blocked') {
        const checkDeadline = (dateStr, type) => {
          if (!dateStr) return;
          const targetDate = new Date(dateStr);
          targetDate.setHours(0, 0, 0, 0);

          const diffTime = targetDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Notify if deadline is within 2 days or overdue (up to 7 days)
          if (diffDays <= 2 && diffDays >= -7) {
            deadlineNotifs.push({
              id: `deadline-${p.id}-${type}`,
              projectId: p.id,
              projectName: p.projectName,
              message: diffDays < 0 ? `${type} ETA is overdue by ${Math.abs(diffDays)} day(s)!` : `${type} ETA is approaching in ${diffDays} day(s)`,
              type: 'deadline',
              timestamp: targetDate.getTime(),
              read: false,
              isUrgent: diffDays <= 0
            });
          }
        };
        checkDeadline(p.clientETA, 'Client');
        checkDeadline(p.testerETA, 'Tester');
      }
    });

    return [...dbNotifs, ...deadlineNotifs].sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications, projects, currentUserDisplayName]);

  const uniqueProductAreas = useMemo(() => {
    // Automatically extract all unique product areas currently in the database
    const areas = projects.map(p => p.productArea?.trim()).filter(Boolean);
    return [...new Set(areas)].sort();
  }, [projects]);

  const allActivity = useMemo(() => {
    const activities = [];
    projects.forEach(p => {
      if (p.comments) {
        p.comments.forEach(c => {
          activities.push({ ...c, projectName: p.projectName, projectId: p.id });
        });
      }
    });
    return activities.sort((a, b) => b.timestamp - a.timestamp);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.bugNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productArea?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchesLead = leadFilter === 'All' || p.assignedLead === leadFilter;
      const matchesProductArea = productAreaFilter === 'All' || p.productArea?.trim() === productAreaFilter;

      return matchesSearch && matchesStatus && matchesLead && matchesProductArea;
    });
  }, [projects, searchQuery, statusFilter, leadFilter, productAreaFilter]);

  // --- Handlers ---
  const handleSaveProject = async (projectData) => {
    if (!user) return;
    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const notifRef = collection(db, 'artifacts', appId, 'public', 'data', 'notifications');

    try {
      let savedProjectId = projectData.id;
      const oldProject = projectData.id ? projects.find(p => p.id === projectData.id) : null;

      if (projectData.id) {
        // Update
        const docRef = doc(projectsRef, projectData.id);
        await updateDoc(docRef, { ...projectData, updatedAt: Date.now() });
      } else {
        // Create
        const newDocRef = await addDoc(projectsRef, {
          ...projectData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          comments: []
        });
        savedProjectId = newDocRef.id;
      }

      // Check for Assignment Notification
      if (projectData.assignedLead !== 'Unassigned' && projectData.assignedLead !== currentUserDisplayName) {
        if (!oldProject || oldProject.assignedLead !== projectData.assignedLead) {
          await addDoc(notifRef, {
            recipient: projectData.assignedLead,
            type: 'assignment',
            message: `assigned you to`,
            projectId: savedProjectId,
            projectName: projectData.projectName,
            author: currentUserDisplayName,
            timestamp: Date.now(),
            read: false
          });
        }
      }

      setIsFormOpen(false);
    } catch (err) {
      console.error("Error saving project:", err);
    }
  };

  const handleAddComment = async (projectId, commentText, isPinned = false) => {
    if (!user || !commentText.trim()) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newComment = {
      id: crypto.randomUUID(),
      text: commentText,
      author: currentUserDisplayName,
      timestamp: Date.now(),
      isPinned: isPinned
    };

    const updatedComments = [...(project.comments || []), newComment];
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);

    await updateDoc(docRef, { comments: updatedComments });

    // Handle Mentions
    const mentions = commentText.match(/@([a-zA-Z0-9_]+)/g) || [];
    const uniqueMentions = [...new Set(mentions)].map(m => m.substring(1));

    for (const name of uniqueMentions) {
      if (name !== currentUserDisplayName) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
          recipient: name,
          type: 'mention',
          message: `mentioned you in a comment on`,
          projectId: project.id,
          projectName: project.projectName,
          author: currentUserDisplayName,
          timestamp: Date.now(),
          read: false
        });
      }
    }
  };

  const handleTogglePinComment = async (projectId, commentId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedComments = project.comments.map(c =>
      c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
    );

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    await updateDoc(docRef, { comments: updatedComments });
  };

  const handleDeleteProject = async (projectId) => {
    if (!isAdmin) return;
    if (window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId));
      setSelectedProject(null);
    }
  };

  const handleUpdateLocale = async (projectId, localeName, newStatus) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedLocales = project.locales?.map(loc =>
      loc.name === localeName ? { ...loc, status: newStatus } : loc
    ) || [];

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId), {
      locales: updatedLocales
    });
  };

  const handleToggleQuoteField = async (e, projectId, field, currentValue) => {
    if (e && e.stopPropagation) e.stopPropagation(); // Prevents opening the project details panel when clicking from the table
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId);
    await updateDoc(docRef, { [field]: !currentValue, updatedAt: Date.now() });
  };

  const handleMarkNotifRead = async (notifId) => {
    if (notifId.startsWith('deadline-')) return; // Deadlines are in-memory, handled implicitly
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', notifId), { read: true });
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        // Fallback to anonymous auth specifically for the Canvas preview environment
        setAuthError('Preview Environment detected. Automatically falling back to guest mode...');
        setTimeout(async () => {
          await signInAnonymously(auth);
        }, 1500);
      } else {
        setAuthError('Sign in failed. Please try again.');
      }
    }
  };

  // --- New Advanced Handlers ---
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;
    const headers = ['Bug Number', 'Project Name', 'Product Area', 'Status', 'Priority', 'Assigned Lead', 'Client ETA', 'Tester ETA', 'Quote Ready', 'Quote Sent'];
    const csvRows = [headers.join(',')];

    filteredProjects.forEach(p => {
      const row = [
        p.bugNumber || '',
        `"${(p.projectName || '').replace(/"/g, '""')}"`,
        `"${(p.productArea || '').replace(/"/g, '""')}"`,
        p.status || '',
        p.priority || '',
        p.assignedLead || '',
        p.clientETA || '',
        p.testerETA || '',
        p.quoteReady ? 'Yes' : 'No',
        p.quoteSent ? 'Yes' : 'No'
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Projects_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleToggleSelectProject = (projectId) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjectIds.length === filteredProjects.length && filteredProjects.length > 0) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(filteredProjects.map(p => p.id));
    }
  };

  const handleBulkUpdate = async (field, value) => {
    if (selectedProjectIds.length === 0) return;
    const batchPromises = selectedProjectIds.map(id => {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'projects', id);
      return updateDoc(docRef, { [field]: value, updatedAt: Date.now() });
    });
    await Promise.all(batchPromises);
    setSelectedProjectIds([]); // Clear selection after update
  };

  const handleCloneProject = (project) => {
    const { id, comments, createdAt, updatedAt, ...clonedData } = project;
    setSelectedProject(null); // Close details modal
    setIsFormOpen(true);      // Open creation form
    // Set form state (without ID, so it creates a new document on save)
    setSelectedProject({ ...clonedData, projectName: `${clonedData.projectName} (Copy)` });
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Loading Dashboard...</div>;

  // The external Login Screen
  if (!user) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 mb-6 text-2xl">
            P
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Polyglot PM</h1>
          <p className="text-slate-500 mb-8">Please sign in with your Google account to access the dashboard.</p>

          {authError && (
            <div className="mb-6 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
              {authError}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* Sidebar Navigation */}
      <div className="w-16 bg-slate-900 flex flex-col items-center py-6 shadow-xl z-10 justify-between">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
            P
          </div>
          <nav className="flex flex-col gap-4 mt-8">
            <button onClick={() => setViewMode('table')} className={`p-3 rounded-xl transition-colors ${viewMode === 'table' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}`} title="Table View"><List size={24} /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-3 rounded-xl transition-colors ${viewMode === 'kanban' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}`} title="Kanban View"><Kanban size={24} /></button>
            <button onClick={() => setViewMode('metrics')} className={`p-3 rounded-xl transition-colors ${viewMode === 'metrics' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}`} title="Metrics & Analytics"><BarChart2 size={24} /></button>
          </nav>
        </div>

        {/* Real User Profile Area */}
        <div className="flex flex-col items-center gap-4 mb-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => signOut(auth)}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>

          {user.displayName || user.email ? (
            // Authenticated Google User
            user.photoURL ? (
              <img src={user.photoURL} alt={currentUserDisplayName} className="w-10 h-10 rounded-full border-2 border-slate-700" title={currentUserDisplayName} />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-slate-700 ${isAdmin ? 'bg-amber-500' : 'bg-indigo-500'}`} title={currentUserDisplayName}>
                {currentUserDisplayName.charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            // Fallback for canvas previews 
            <button
              onClick={handleGoogleSignIn}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-slate-700 hover:bg-indigo-500 transition-colors border-2 border-slate-600"
              title="Sign in with Google"
            >
              G
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header & Controls */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Polyglot PM</h1>
            <p className="text-sm text-slate-500 mt-1">Manage intake, testing, and quotes</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search bugs, projects..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
              {myNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-white">
                  {myNotifications.length > 9 ? '9+' : myNotifications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsActivityOpen(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Global Activity History"
            >
              <History size={20} />
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Export to CSV"
            >
              <Download size={20} />
            </button>

            <button
              onClick={() => { setSelectedProject(null); setIsFormOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus size={18} /> New Project
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="px-8 py-4 flex gap-4 bg-white border-b border-slate-100 shadow-sm z-0">
          <select
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)}
          >
            <option value="All">All Leads</option>
            {dynamicTeamMembers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={productAreaFilter} onChange={(e) => setProductAreaFilter(e.target.value)}
          >
            <option value="All">All Product Areas</option>
            {uniqueProductAreas.map(pa => <option key={pa} value={pa}>{pa}</option>)}
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedProjectIds.length > 0 && viewMode === 'table' && (
          <div className="bg-indigo-50 dark:bg-indigo-900/40 border-b border-indigo-100 dark:border-indigo-800 px-8 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
              <CheckSquare size={16} className="inline mr-2 relative -top-0.5" />
              {selectedProjectIds.length} project(s) selected
            </span>
            <div className="flex gap-3">
              <select
                onChange={(e) => { if (e.target.value) handleBulkUpdate('status', e.target.value); e.target.value = ''; }}
                className="text-xs border border-indigo-200 dark:border-indigo-700 rounded-md px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="">Set Status...</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                onChange={(e) => { if (e.target.value) handleBulkUpdate('assignedLead', e.target.value); e.target.value = ''; }}
                className="text-xs border border-indigo-200 dark:border-indigo-700 rounded-md px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="">Assign To...</option>
                {dynamicTeamMembers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={() => setSelectedProjectIds([])} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-2">Cancel</button>
            </div>
          </div>
        )}

        {/* Project View (Table or Kanban or Metrics) */}
        <div className="flex-1 overflow-auto p-8 dark:bg-slate-900 transition-colors">
          {viewMode === 'table' ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredProjects.length > 0 && selectedProjectIds.length === filteredProjects.length}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-4 font-medium">Bug / Project</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Priority</th>
                    <th className="px-6 py-4 font-medium">Lead</th>
                    <th className="px-6 py-4 font-medium">ETAs (Client / Tester)</th>
                    <th className="px-6 py-4 font-medium">Quotes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                        No projects found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map(project => {
                      const prio = PRIORITIES.find(p => p.id === project.priority) || PRIORITIES[2];
                      const isSelected = selectedProjectIds.includes(project.id);
                      return (
                        <tr
                          key={project.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                          onClick={(e) => {
                            if (e.target.tagName.toLowerCase() !== 'input') setSelectedProject(project);
                          }}
                        >
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProject(project.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{project.bugNumber || 'No Bug ID'}</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{project.projectName}</div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPAColor(project.productArea)}`}>
                                {project.productArea || 'No PA'}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">• {project.devices}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(project.status).bg} ${getStatusStyle(project.status).text} ${getStatusStyle(project.status).border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(project.status).dot}`}></span>
                              {project.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${prio.color}`}>
                              {prio.id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                {project.assignedLead?.charAt(0)}
                              </div>
                              <span className="text-sm text-slate-700">{project.assignedLead}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-600 flex flex-col gap-1">
                              <span title="Client ETA" className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> {project.clientETA || 'Not set'}</span>
                              <span title="Tester ETA" className="flex items-center gap-1.5 text-xs text-slate-500">T: {project.testerETA || 'Not set'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleToggleQuoteField(e, project.id, 'quoteReady', project.quoteReady)}
                                className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${project.quoteReady ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`}
                                title={project.quoteReady ? "Quote ready (click to mark needed)" : "Quote needed (click to mark ready)"}
                              >
                                {project.quoteReady ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                              </button>
                              <button
                                onClick={(e) => handleToggleQuoteField(e, project.id, 'quoteSent', project.quoteSent)}
                                className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${project.quoteSent ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                                title={project.quoteSent ? "Quote sent (click to unmark)" : "Quote not sent (click to mark sent)"}
                              >
                                <Send size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-8">
              {STATUSES.map(status => {
                const statusProjects = filteredProjects.filter(p => p.status === status);
                if (statusFilter !== 'All' && statusFilter !== status) return null; // Hide other columns if filtered

                return (
                  <div key={status} className="flex flex-col h-[450px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusStyle(status).dot}`}></span>
                        {status}
                      </h3>
                      <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{statusProjects.length}</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-3 overflow-y-auto bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                      {statusProjects.map(project => {
                        const prio = PRIORITIES.find(p => p.id === project.priority) || PRIORITIES[2];
                        return (
                          <div
                            key={project.id}
                            onClick={() => setSelectedProject(project)}
                            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{project.bugNumber}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${prio.color}`}>{prio.id}</span>
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 leading-tight">{project.projectName}</h4>
                            <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPAColor(project.productArea)}`}>
                                {project.productArea || 'No PA'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-1.5" title={`Lead: ${project.assignedLead}`}>
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  {project.assignedLead?.charAt(0)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {project.comments?.length > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-slate-400"><MessageSquare size={12} /> {project.comments.length}</span>
                                )}
                                {project.locales?.length > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-slate-400"><Globe2 size={12} /> {project.locales.filter(l => l.status === 'Passed').length}/{project.locales.length}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {statusProjects.length === 0 && (
                        <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-xs text-slate-400">
                          Drop projects here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'metrics' ? (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BarChart2 className="text-indigo-500" /> Analytics & Workload Overview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Breakdown */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Projects by Status</h3>
                  <div className="space-y-4">
                    {STATUSES.map(status => {
                      const count = filteredProjects.filter(p => p.status === status).length;
                      const percentage = filteredProjects.length > 0 ? Math.round((count / filteredProjects.length) * 100) : 0;
                      if (count === 0) return null;
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{status}</span>
                            <span className="text-slate-500">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div className={`h-2 rounded-full ${getStatusStyle(status).dot}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Team Workload */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">Active Workload by Lead</h3>
                  <div className="space-y-4">
                    {dynamicTeamMembers.map(member => {
                      // Only count active projects (not completed/blocked)
                      const count = filteredProjects.filter(p => p.assignedLead === member && p.status !== 'Completed' && p.status !== 'Blocked').length;
                      const maxCount = Math.max(...dynamicTeamMembers.map(m => filteredProjects.filter(p => p.assignedLead === m && p.status !== 'Completed' && p.status !== 'Blocked').length), 1);
                      const percentage = Math.round((count / maxCount) * 100);

                      // Show if they have workload OR if it's the current user
                      if (count === 0 && member !== currentUserDisplayName) return null;

                      return (
                        <div key={member}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">{member.charAt(0)}</span>
                              {member}
                            </span>
                            <span className="text-slate-500">{count} active</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Slide-over Panels for Form & Details */}
      {isNotifOpen && (
        <NotificationFeed
          notifications={myNotifications}
          onClose={() => setIsNotifOpen(false)}
          onMarkRead={handleMarkNotifRead}
          onOpenProject={(projectId) => {
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
              setSelectedProject(proj);
              setIsNotifOpen(false);
            }
          }}
        />
      )}

      {isActivityOpen && (
        <ActivityFeed
          activities={allActivity}
          onClose={() => setIsActivityOpen(false)}
          onOpenProject={(projectId) => {
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
              setSelectedProject(proj);
              setIsActivityOpen(false);
            }
          }}
        />
      )}

      {isFormOpen && (
        <ProjectForm
          project={selectedProject}
          onClose={() => { setIsFormOpen(false); setSelectedProject(null); }}
          onSave={handleSaveProject}
          teamMembers={dynamicTeamMembers}
          uniqueProductAreas={uniqueProductAreas}
        />
      )}

      {selectedProject && !isFormOpen && (
        <ProjectDetails
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onEdit={() => setIsFormOpen(true)}
          onClone={() => handleCloneProject(selectedProject)}
          onAddComment={handleAddComment}
          onTogglePin={handleTogglePinComment}
          isAdmin={isAdmin}
          onDelete={handleDeleteProject}
          onUpdateLocale={handleUpdateLocale}
          onToggleQuoteField={handleToggleQuoteField}
        />
      )}
    </div>
  );
}

// Simple Markdown Parser for comments
const parseMarkdown = (text) => {
  if (!text) return { __html: '' };
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // basic sanitization
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">$1</a>') // links
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-sm text-pink-600 font-mono">$1</code>') // inline code
    .replace(/\n/g, '<br />'); // newlines
  return { __html: html };
};

// --- Subcomponents ---

function ProjectForm({ project, onClose, onSave, teamMembers, uniqueProductAreas }) {
  const [formData, setFormData] = useState(project || {
    bugNumber: '',
    projectName: '',
    productArea: '',
    devices: '',
    assignedLead: 'Unassigned',
    priority: 'P2',
    status: 'Need Assessment',
    testerETA: '',
    clientETA: '',
    testCasesCount: '',
    quoteReady: false,
    quoteSent: false,
    locales: [],
    projectFolderUrl: '',
    quoteUrl: ''
  });
  const [customLocaleInput, setCustomLocaleInput] = useState('');

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleLocale = (localeName) => {
    setFormData(prev => {
      const exists = prev.locales?.find(l => l.name === localeName);
      if (exists) {
        return { ...prev, locales: prev.locales.filter(l => l.name !== localeName) };
      } else {
        return { ...prev, locales: [...(prev.locales || []), { name: localeName, status: 'Pending' }] };
      }
    });
  };

  const handleAddCustomLocales = () => {
    if (!customLocaleInput.trim()) return;
    const newLocales = customLocaleInput.split(',').map(l => l.trim()).filter(l => l);

    setFormData(prev => {
      const updatedLocales = [...(prev.locales || [])];
      newLocales.forEach(loc => {
        if (!updatedLocales.find(l => l.name === loc)) {
          updatedLocales.push({ name: loc, status: 'Pending' });
        }
      });
      return { ...prev, locales: updatedLocales };
    });
    setCustomLocaleInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <div className="w-[500px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">{project ? 'Edit Project' : 'New Intake Request'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Identifiers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bug Number</label>
              <input required name="bugNumber" value={formData.bugNumber} onChange={handleChange} placeholder="b/12345678" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Product Area</label>
              <input required name="productArea" list="pa-list" value={formData.productArea} onChange={handleChange} placeholder="e.g. Search, Maps" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" autoComplete="off" />
              <datalist id="pa-list">
                {uniqueProductAreas?.map(pa => <option key={pa} value={pa} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Project Name</label>
            <input required name="projectName" value={formData.projectName} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Devices / Platforms</label>
            <input name="devices" value={formData.devices} onChange={handleChange} placeholder="iOS, Android, Web..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {/* Workflow & Assignment */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assigned Lead</label>
              <select name="assignedLead" value={formData.assignedLead} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Test Cases (Count)</label>
              <input type="number" name="testCasesCount" value={formData.testCasesCount} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client ETA</label>
              <input type="date" name="clientETA" value={formData.clientETA} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tester ETA</label>
              <input type="date" name="testerETA" value={formData.testerETA} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Project Folder Link</label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input name="projectFolderUrl" value={formData.projectFolderUrl || ''} onChange={handleChange} placeholder="https://drive.google.com/..." className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Quote Link</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input name="quoteUrl" value={formData.quoteUrl || ''} onChange={handleChange} placeholder="https://docs.google.com/..." className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Testing Locales */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Globe2 size={14} className="text-indigo-500" /> Target Locales
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.from(new Set([...AVAILABLE_LOCALES, ...(formData.locales?.map(l => l.name) || [])])).map(loc => {
                const isSelected = formData.locales?.some(l => l.name === loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => toggleLocale(loc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isSelected ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
            {/* Custom Locales Input */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={customLocaleInput}
                onChange={(e) => setCustomLocaleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomLocales(); } }}
                placeholder="Add custom (e.g. ru-RU, pl-PL)"
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomLocales}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Quotes Section */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Quote Management</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" name="quoteReady" checked={formData.quoteReady} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                <span className="text-sm font-medium text-slate-700">Quote ready</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" name="quoteSent" checked={formData.quoteSent} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                <span className="text-sm font-medium text-slate-700">Quote sent</span>
              </label>
            </div>
          </div>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
            {project ? (project.id ? 'Save Changes' : 'Create Clone') : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetails({ project, onClose, onEdit, onClone, onAddComment, onTogglePin, isAdmin, onDelete, onUpdateLocale, onToggleQuoteField }) {
  const [newComment, setNewComment] = useState('');
  const [commentSort, setCommentSort] = useState('newest'); // 'newest' | 'oldest' | 'pinned'

  const prio = PRIORITIES.find(p => p.id === project.priority) || PRIORITIES[2];

  const sortedComments = useMemo(() => {
    const comments = [...(project.comments || [])];
    if (commentSort === 'pinned') {
      return comments.sort((a, b) => {
        if (a.isPinned === b.isPinned) return b.timestamp - a.timestamp;
        return a.isPinned ? -1 : 1;
      });
    }
    if (commentSort === 'oldest') {
      return comments.sort((a, b) => a.timestamp - b.timestamp);
    }
    return comments.sort((a, b) => b.timestamp - a.timestamp); // newest
  }, [project.comments, commentSort]);

  const submitComment = (e) => {
    e.preventDefault();
    onAddComment(project.id, newComment);
    setNewComment('');
  };

  return (
    <div className="w-[500px] border-l border-slate-200 bg-white flex flex-col h-full shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.1)] z-20">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>

        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-sm text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">{project.bugNumber}</span>
          <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${prio.color}`}>{prio.id}</span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1 pr-8">{project.projectName}</h2>
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPAColor(project.productArea)}`}>
            {project.productArea || 'No PA'}
          </span>
          <span className="text-sm text-slate-500">• {project.devices}</span>
        </div>

        <div className="flex items-center gap-4 mt-5">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={onClone} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            <Copy size={14} /> Clone
          </button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusStyle(project.status).bg} ${getStatusStyle(project.status).text} ${getStatusStyle(project.status).border}`}>
            <span className={`w-2 h-2 rounded-full ${getStatusStyle(project.status).dot}`}></span>
            {project.status}
          </span>

          {isAdmin && (
            <button onClick={() => onDelete(project.id)} className="ml-auto flex items-center gap-1.5 text-sm font-medium text-red-600 hover:bg-red-50 bg-white border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* At a glance */}
        <div className="p-6 border-b border-slate-100 grid grid-cols-2 gap-y-6 gap-x-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assigned Lead</p>
            <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">{project.assignedLead?.charAt(0)}</span>
              {project.assignedLead}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Test Cases</p>
            <p className="text-sm font-medium text-slate-800">{project.testCasesCount || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Client ETA</p>
            <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> {project.clientETA || '--'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tester ETA</p>
            <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> {project.testerETA || '--'}</p>
          </div>

          {/* Document Links */}
          {(project.projectFolderUrl || project.quoteUrl) && (
            <div className="col-span-2 flex flex-wrap gap-3 mt-1">
              {project.projectFolderUrl && (
                <a href={project.projectFolderUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors">
                  <Folder size={16} /> Project Folder <ExternalLink size={12} className="opacity-50" />
                </a>
              )}
              {project.quoteUrl && (
                <a href={project.quoteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                  <FileText size={16} /> Quote Doc <ExternalLink size={12} className="opacity-50" />
                </a>
              )}
            </div>
          )}

          <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-6 mt-2">
            <button
              onClick={(e) => onToggleQuoteField(e, project.id, 'quoteReady', project.quoteReady)}
              className="flex items-center gap-2 hover:opacity-75 transition-opacity outline-none"
            >
              {project.quoteReady ? (
                <><CheckCircle2 size={16} className="text-green-500" /> <span className="text-sm font-medium text-slate-700">Quote ready</span></>
              ) : (
                <><AlertCircle size={16} className="text-amber-500" /> <span className="text-sm font-medium text-amber-700">Quote needed</span></>
              )}
            </button>
            <button
              onClick={(e) => onToggleQuoteField(e, project.id, 'quoteSent', project.quoteSent)}
              className="flex items-center gap-2 hover:opacity-75 transition-opacity outline-none"
            >
              {project.quoteSent ? <Send size={16} className="text-blue-500" /> : <XCircle size={16} className="text-slate-300" />}
              <span className="text-sm font-medium text-slate-700">Quote sent</span>
            </button>
          </div>

          {/* Locales Checklist */}
          {project.locales?.length > 0 && (
            <div className="col-span-2 mt-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Globe2 size={14} className="text-indigo-500" /> Locales Status
              </h3>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {project.locales.map(loc => (
                  <div key={loc.name} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-semibold text-slate-700 w-20">{loc.name}</span>
                    <div className="flex gap-1.5">
                      {['Pending', 'Testing', 'Passed', 'Failed'].map(st => (
                        <button
                          key={st}
                          onClick={() => onUpdateLocale(project.id, loc.name, st)}
                          className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${loc.status === st
                              ? (st === 'Passed' ? 'bg-green-100 text-green-700' : st === 'Failed' ? 'bg-red-100 text-red-700' : st === 'Testing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700')
                              : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={16} /> Activity & Comments ({project.comments?.length || 0})
            </h3>
            <select
              value={commentSort}
              onChange={(e) => setCommentSort(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded p-1 text-slate-600 outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="pinned">Pinned First</option>
            </select>
          </div>

          <form onSubmit={submitComment} className="mb-6 relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write an update or comment..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[80px] bg-slate-50 focus:bg-white transition-colors pb-10"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(e); } }}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="absolute bottom-2 right-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-1.5 rounded-lg transition-colors"
            >
              <Send size={14} />
            </button>
          </form>

          <div className="space-y-4">
            {sortedComments.map(comment => (
              <div key={comment.id} className={`p-4 rounded-xl border ${comment.isPinned ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-100'} shadow-sm relative group`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{comment.author}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => onTogglePin(project.id, comment.id)}
                    className={`p-1 rounded transition-colors ${comment.isPinned ? 'text-amber-500 bg-amber-100' : 'text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100'}`}
                    title={comment.isPinned ? "Unpin comment" : "Pin comment"}
                  >
                    <Pin size={14} className={comment.isPinned ? "fill-amber-500" : ""} />
                  </button>
                </div>
                <div
                  className="text-sm text-slate-600 leading-relaxed"
                  dangerouslySetInnerHTML={parseMarkdown(comment.text)}
                />
              </div>
            ))}
            {sortedComments.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-4">No comments yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ activities, onClose, onOpenProject }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <div className="w-[400px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right border-l border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History size={18} className="text-indigo-600" /> Activity History
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {activities.length === 0 ? (
              <p className="text-center text-slate-500 text-sm mt-10">No activity recorded yet.</p>
            ) : (
              activities.map(act => (
                <div key={act.id} className="relative pl-4 border-l-2 border-slate-200">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="font-semibold text-sm text-slate-800">{act.author}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(act.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p
                    className="text-xs font-medium text-indigo-600 mb-2 cursor-pointer hover:underline flex items-center gap-1"
                    onClick={() => onOpenProject(act.projectId)}
                  >
                    on {act.projectName}
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{act.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationFeed({ notifications, onClose, onOpenProject, onMarkRead }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <div className="w-[400px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right border-l border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bell size={18} className="text-indigo-600" /> Notifications
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-center text-slate-500 text-sm mt-10">You're all caught up!</p>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => {
                  onMarkRead(notif.id);
                  onOpenProject(notif.projectId);
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${notif.isUrgent ? 'bg-red-50 border-red-200' : 'bg-slate-50 hover:bg-white border-slate-200'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {notif.type === 'mention' && <MessageSquare size={12} className="text-blue-500" />}
                    {notif.type === 'assignment' && <Pin size={12} className="text-emerald-500" />}
                    {notif.type === 'deadline' && <AlertCircle size={12} className={notif.isUrgent ? "text-red-500" : "text-amber-500"} />}
                    {notif.type}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(notif.timestamp).toLocaleString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <p className="text-sm text-slate-700 mt-1">
                  {notif.author && <span className="font-semibold text-slate-900">{notif.author}</span>} {notif.message} <span className="font-semibold text-indigo-600">{notif.projectName}</span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}