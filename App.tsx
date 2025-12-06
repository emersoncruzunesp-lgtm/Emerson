import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, CheckCircle, Trash2, Edit2, RotateCcw, 
  Tag, Download, Printer, Sun, Moon, 
  Sparkles, X, Plus, User, ChevronDown
} from 'lucide-react';
import { IActivity, ITag, IUser } from './types';
import * as storage from './services/storage';
import * as aiService from './services/ai';
import { StatsChart } from './components/StatsChart';

// --- Utils ---
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split('-').reverse().join('/');
};

const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

// --- Main App Component ---
const App: React.FC = () => {
  // User State
  const [users, setUsers] = useState<IUser[]>([]);
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  // Data State (Dependent on User)
  const [activities, setActivities] = useState<IActivity[]>([]);
  const [tags, setTags] = useState<ITag[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number>(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Input States
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputDay, setInputDay] = useState('');
  const [inputName, setInputName] = useState('');
  const [inputEst, setInputEst] = useState('');
  const [inputTag, setInputTag] = useState('');

  // Modals & Filters
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week'>('today');
  
  // Report Filters
  const [reportType, setReportType] = useState<'week' | 'month'>('week');
  const [reportTagFilter, setReportTagFilter] = useState('all');
  const [reportDayFilter, setReportDayFilter] = useState('all');
  const [reportDateFilter, setReportDateFilter] = useState('');

  // Chart Filters
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [chartDayFilter, setChartDayFilter] = useState('all');
  const [chartTagFilter, setChartTagFilter] = useState('all');
  const [chartDateFilter, setChartDateFilter] = useState('');

  // AI Modal
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({ name: '', tag: '', start: '', end: '' });

  // New Tag Form
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#00BCD4');

  const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // --- Initialization ---
  useEffect(() => {
    // Initialize Theme
    document.body.className = theme === 'light' ? 'light-mode' : '';

    // Initialize Users
    const loadedUsers = storage.getUsers();
    const currentUserId = storage.getCurrentUserId();
    const userToSet = loadedUsers.find(u => u.id === currentUserId) || loadedUsers[0];
    
    setUsers(loadedUsers);
    setCurrentUser(userToSet);

    // Initialize default inputs
    const d = new Date();
    setInputDay(daysOfWeek[d.getDay()]);
  }, []);

  // --- Load Data when Current User Changes ---
  useEffect(() => {
    if (!currentUser) return;

    // Load data specific to current user
    const userTags = storage.getTags(currentUser.id);
    setActivities(storage.getActivities(currentUser.id));
    setTags(userTags);
    setDailyGoal(storage.getDailyGoal(currentUser.id));

    // Reset Tag input default
    if (userTags.length > 0) setInputTag(userTags[0].name);

  }, [currentUser]);

  useEffect(() => {
    // Sync Theme
    document.body.style.backgroundColor = theme === 'light' ? '#F5F8FA' : '#0F1419';
    document.body.style.color = theme === 'light' ? '#0F1419' : '#E8EAED';
  }, [theme]);

  // --- Timer Logic ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentUser) return;

      const now = Date.now();
      setActivities(prev => {
        let changed = false;
        const next = prev.map(act => {
          if (act.isRunning && act.lastTick) {
            const diff = Math.floor((now - act.lastTick) / 1000);
            if (diff > 0) {
              changed = true;
              return {
                ...act,
                elapsedSeconds: act.elapsedSeconds + diff,
                lastTick: now,
                endTime: new Date().toTimeString().slice(0, 5)
              };
            }
          }
          return act;
        });
        if (changed) {
          storage.saveActivities(currentUser.id, next);
          return next;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // --- User Management Actions ---
  const handleSwitchUser = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setCurrentUser(selectedUser);
      storage.setCurrentUserId(selectedUser.id);
      setIsUserMenuOpen(false);
    }
  };

  const handleCreateUser = () => {
    if (!newUserName.trim()) return alert("Digite um nome para o usuário.");

    const newUser: IUser = {
      id: generateId(),
      name: newUserName.trim()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    storage.saveUsers(updatedUsers);
    
    // Switch to new user immediately
    setCurrentUser(newUser);
    storage.setCurrentUserId(newUser.id);
    
    setNewUserName('');
    setIsNewUserModalOpen(false);
    setIsUserMenuOpen(false);
  };

  // --- Activity Actions ---

  const handleAddActivity = () => {
    if (!currentUser) return;
    if (!inputName || !inputEst) return alert("Preencha o nome e a estimativa!");
    
    const newAct: IActivity = {
      id: generateId(),
      title: inputName,
      tag: inputTag || (tags[0]?.name || 'Geral'),
      estimatedMinutes: parseInt(inputEst),
      date: inputDate,
      day: inputDay,
      startTime: '',
      endTime: '',
      elapsedSeconds: 0,
      isRunning: false,
      completed: false
    };

    const newActivities = [...activities, newAct];
    setActivities(newActivities);
    storage.saveActivities(currentUser.id, newActivities);
    setInputName('');
    setInputEst('');
  };

  const toggleTimer = (id: string) => {
    if (!currentUser) return;
    const now = Date.now();
    const updated = activities.map(a => {
      if (a.id === id) {
        if (a.isRunning) {
          return { ...a, isRunning: false, lastTick: undefined };
        } else {
          return { 
            ...a, 
            isRunning: true, 
            lastTick: now, 
            startTime: a.startTime || new Date().toTimeString().slice(0, 5) 
          };
        }
      }
      return a;
    });
    setActivities(updated);
    storage.saveActivities(currentUser.id, updated);
  };

  const completeActivity = (id: string) => {
    if (!currentUser) return;
    const updated = activities.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          isRunning: false, 
          completed: true, 
          completedAt: new Date().toISOString(),
          endTime: a.endTime || new Date().toTimeString().slice(0, 5)
        };
      }
      return a;
    });
    setActivities(updated);
    storage.saveActivities(currentUser.id, updated);
  };

  const restoreActivity = (id: string) => {
    if (!currentUser) return;
    const updated = activities.map(a => 
      a.id === id ? { ...a, completed: false } : a
    );
    setActivities(updated);
    storage.saveActivities(currentUser.id, updated);
  };

  const deleteActivity = (id: string) => {
    if (!currentUser) return;
    if (confirm("Excluir atividade?")) {
      const updated = activities.filter(a => a.id !== id);
      setActivities(updated);
      storage.saveActivities(currentUser.id, updated);
    }
  };

  const clearAllData = () => {
    if (!currentUser) return;
    if (confirm(`Apagar todos os dados do usuário ${currentUser.name}?`)) {
      // Only clear current user data
      storage.saveActivities(currentUser.id, []);
      setActivities([]);
      // We could clear tags and goal too, but let's keep it safe
      alert("Atividades apagadas.");
    }
  };

  const exportCSV = () => {
    let csv = "Dia,Data,Atividade,Tag,Estimado(min),Inicio,Fim,Duracao\n";
    activities.forEach(a => {
      csv += `${a.day},${a.date},${a.title},${a.tag},${a.estimatedMinutes},${a.startTime},${a.endTime},${formatTime(a.elapsedSeconds)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atividades_${currentUser?.name || 'export'}.csv`;
    link.click();
  };

  const saveDailyGoal = () => {
    if (!currentUser) return;
    const val = prompt("Defina a meta diária em minutos:", dailyGoal.toString());
    if (val !== null) {
      const num = parseInt(val);
      setDailyGoal(num);
      storage.saveDailyGoal(currentUser.id, num);
    }
  };

  // --- Tag Management ---
  const handleAddTag = () => {
    if (!currentUser) return;
    if (newTagName) {
      const newTag = { name: newTagName, color: newTagColor };
      const updated = [...tags, newTag];
      setTags(updated);
      storage.saveTags(currentUser.id, updated);
      setNewTagName('');
    }
  };

  const removeTag = (name: string) => {
    if (!currentUser) return;
    const updated = tags.filter(t => t.name !== name);
    setTags(updated);
    storage.saveTags(currentUser.id, updated);
  };

  // --- Edit Management ---
  const openEdit = (act: IActivity) => {
    setEditingId(act.id);
    setEditForm({
      name: act.title,
      tag: act.tag,
      start: act.startTime,
      end: act.endTime
    });
    setIsEditModalOpen(true);
  };

  const saveEdit = () => {
    if (!currentUser) return;
    if (editingId) {
      const updated = activities.map(a => {
        if (a.id === editingId) {
          return {
            ...a,
            title: editForm.name,
            tag: editForm.tag,
            startTime: editForm.start,
            endTime: editForm.end
          };
        }
        return a;
      });
      setActivities(updated);
      storage.saveActivities(currentUser.id, updated);
      setIsEditModalOpen(false);
    }
  };

  // --- AI ---
  const handleAiAnalysis = async () => {
    setIsAiModalOpen(true);
    setAiAnalysis('');
    setIsAiLoading(true);
    const result = await aiService.analyzeProductivity(activities);
    setAiAnalysis(result);
    setIsAiLoading(false);
  };

  // --- Helper for Filtering ---
  const checkPeriodFilter = (activity: IActivity, periodType: 'week' | 'month') => {
    if (!activity.date) return false;
    const activityDate = new Date(activity.date + 'T00:00:00');
    const now = new Date();
    
    if (periodType === 'week') {
      const isSameWeek = getWeekNumber(activityDate) === getWeekNumber(now) && 
                         activityDate.getFullYear() === now.getFullYear();
      return isSameWeek;
    } else if (periodType === 'month') {
      const isSameMonth = activityDate.getMonth() === now.getMonth() && 
                          activityDate.getFullYear() === now.getFullYear();
      return isSameMonth;
    }
    return true;
  };

  // --- Rendering Helpers ---
  const activeActivities = activities.filter(a => !a.completed).filter(a => {
    if (filterPeriod === 'today') return a.date === new Date().toISOString().split('T')[0];
    if (filterPeriod === 'week') {
       return checkPeriodFilter(a, 'week');
    }
    return true;
  });

  const completedActivities = activities.filter(a => a.completed).filter(a => {
    if (reportTagFilter !== 'all' && a.tag !== reportTagFilter) return false;
    if (reportDayFilter !== 'all' && a.day !== reportDayFilter) return false;
    
    // Date Filter Override
    if (reportDateFilter) {
      return a.date === reportDateFilter;
    }

    return checkPeriodFilter(a, reportType);
  });

  const chartActivities = activities.filter(a => a.completed).filter(a => {
    if (chartTagFilter !== 'all' && a.tag !== chartTagFilter) return false;
    if (chartDayFilter !== 'all' && a.day !== chartDayFilter) return false;
    
    // Date Filter Override
    if (chartDateFilter) {
      return a.date === chartDateFilter;
    }

    return checkPeriodFilter(a, chartPeriod);
  });

  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMinutes = activities
    .filter(a => a.date === todayStr)
    .reduce((acc, curr) => acc + curr.elapsedSeconds / 60, 0);
  
  const goalPercent = dailyGoal > 0 ? Math.min(100, (todayMinutes / dailyGoal) * 100) : 0;
  const weekTotalSeconds = activities.reduce((acc, curr) => acc + curr.elapsedSeconds, 0);

  // Styling Constants
  const cardClass = `p-5 rounded-lg border shadow-sm mb-5 ${theme === 'dark' ? 'bg-[#1A1F26] border-[#2D3139]' : 'bg-white border-gray-200'}`;
  const inputClass = `w-full p-2 rounded border ${theme === 'dark' ? 'bg-[#0F1419] border-[#2D3139] text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-[#00BCD4]`;
  const btnPrimary = `px-4 py-2 bg-[#00BCD4] hover:bg-[#00acc1] text-white rounded font-medium transition-colors`;
  const btnOutline = `px-4 py-2 border rounded font-medium transition-colors ${theme === 'dark' ? 'border-[#2D3139] text-[#E8EAED] hover:bg-[#2D3139]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`;

  return (
    <div className={`min-h-screen p-4 md:p-6 max-w-7xl mx-auto transition-colors duration-300`}>
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#00BCD4]">Controle Semanal de Atividades</h1>
          <p className={`${theme === 'dark' ? 'text-[#8899A6]' : 'text-gray-500'}`}>Registre, cronometre e acompanhe sua produtividade.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* User Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`${btnOutline} flex items-center gap-2 pr-2`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-green-400 flex items-center justify-center text-xs font-bold text-white">
                 {currentUser?.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate">{currentUser?.name || 'Usuário'}</span>
              <ChevronDown size={14} />
            </button>

            {isUserMenuOpen && (
              <div className={`absolute top-full right-0 mt-2 w-48 rounded-lg shadow-xl z-50 overflow-hidden border ${theme === 'dark' ? 'bg-[#1A1F26] border-[#2D3139]' : 'bg-white border-gray-200'}`}>
                <div className={`px-4 py-2 text-xs font-semibold opacity-50 uppercase`}>Alternar Usuário</div>
                <div className="max-h-48 overflow-y-auto">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSwitchUser(u.id)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#00BCD4]/10 ${u.id === currentUser?.id ? 'text-[#00BCD4] font-semibold' : ''}`}
                    >
                      <User size={14} />
                      {u.name}
                      {u.id === currentUser?.id && <CheckCircle size={12} className="ml-auto" />}
                    </button>
                  ))}
                </div>
                <div className={`border-t ${theme === 'dark' ? 'border-[#2D3139]' : 'border-gray-200'} p-2`}>
                   <button 
                    onClick={() => { setIsUserMenuOpen(false); setIsNewUserModalOpen(true); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-green-500 hover:bg-green-500/10 rounded"
                   >
                     <Plus size={14} /> Novo Usuário
                   </button>
                </div>
              </div>
            )}
          </div>

          <div className={`px-3 py-1.5 rounded border text-sm ${theme === 'dark' ? 'bg-[#1A1F26] border-[#2D3139]' : 'bg-white border-gray-200'}`}>
            Semana: {getWeekNumber(new Date())}
          </div>
          <button 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={btnOutline}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
           <button 
            onClick={handleAiAnalysis}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
          >
            <Sparkles size={16} /> IA Coach
          </button>
        </div>
      </header>

      {/* Input Section */}
      <section className={`${cardClass} print:hidden`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end mb-4">
          <div>
            <label className="block text-xs mb-1 opacity-70">Dia</label>
            <select value={inputDay} onChange={e => setInputDay(e.target.value)} className={inputClass}>
              {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">Data</label>
            <input type="date" value={inputDate} onChange={e => setInputDate(e.target.value)} className={inputClass} />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs mb-1 opacity-70">Atividade</label>
            <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} placeholder="Ex: Relatório Mensal" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">Estimativa (min)</label>
            <input type="number" value={inputEst} onChange={e => setInputEst(e.target.value)} placeholder="60" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">Tag</label>
            <select value={inputTag} onChange={e => setInputTag(e.target.value)} className={inputClass}>
              {tags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6">
          <button onClick={handleAddActivity} className={`${btnPrimary} w-full md:w-auto flex items-center justify-center gap-2`}>
            <Plus size={18} /> Adicionar
          </button>
          
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => setIsTagsModalOpen(true)} className={`${btnOutline} flex items-center gap-2 text-sm`}>
              <Tag size={14} /> Tags
            </button>
            <div className="flex items-center gap-2">
              <select 
                value={filterPeriod} 
                onChange={(e) => setFilterPeriod(e.target.value as any)}
                className={`${inputClass} !w-auto text-sm py-1.5`}
              >
                <option value="all">Todos</option>
                <option value="today">Hoje</option>
                <option value="week">Semana</option>
              </select>
            </div>
            <button onClick={exportCSV} className={`${btnOutline} flex items-center gap-2 text-sm`}>
              <Download size={14} /> CSV
            </button>
            <button onClick={() => window.print()} className={`${btnOutline} flex items-center gap-2 text-sm`}>
              <Printer size={14} /> PDF
            </button>
            <button onClick={clearAllData} className="px-3 py-1.5 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded text-sm transition-colors flex items-center gap-1">
              <Trash2 size={14} /> Limpar
            </button>
          </div>
        </div>
      </section>

      {/* Goal Section */}
      <section className={cardClass}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">Meta Diária</h3>
          <div className="print:hidden">
             <button onClick={saveDailyGoal} className="text-sm text-[#00BCD4] hover:underline">
               Definir Meta ({dailyGoal} min)
             </button>
          </div>
        </div>
        <div className="h-5 w-full bg-gray-700/20 rounded-full overflow-hidden relative">
          <div 
            className="h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
            style={{ 
              width: `${goalPercent}%`,
              backgroundColor: goalPercent >= 100 ? '#4CAF50' : goalPercent > 70 ? '#FFC107' : '#00BCD4'
            }}
          >
            {Math.round(goalPercent)}%
          </div>
        </div>
        <p className="text-center text-xs mt-2 opacity-70">
          {Math.floor(todayMinutes)} de {dailyGoal} minutos
        </p>
      </section>

      {/* Active Tasks Table */}
      <section className={cardClass}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Atividades Ativas</h3>
          <span className="text-sm font-bold opacity-70">
            Total Semana: {formatTime(weekTotalSeconds).slice(0, -3).replace(':', 'h ')}m
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className={`text-left text-xs uppercase opacity-60 border-b ${theme === 'dark' ? 'border-[#2D3139]' : 'border-gray-200'}`}>
                <th className="p-3">Dia/Data</th>
                <th className="p-3">Atividade</th>
                <th className="p-3">Tag</th>
                <th className="p-3">Est. (min)</th>
                <th className="p-3">Início</th>
                <th className="p-3">Fim</th>
                <th className="p-3">Tempo</th>
                <th className="p-3 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody>
              {activeActivities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center opacity-50 italic">
                    Nenhuma atividade ativa.
                  </td>
                </tr>
              ) : (
                activeActivities.map(act => {
                   const tagColor = tags.find(t => t.name === act.tag)?.color || '#555';
                   return (
                    <tr key={act.id} className={`border-b ${theme === 'dark' ? 'border-[#2D3139]' : 'border-gray-200'}`}>
                      <td className="p-3">
                        <div className="text-xs opacity-70">{act.day}</div>
                        <div className="text-sm">{formatDate(act.date)}</div>
                      </td>
                      <td className="p-3 font-medium">{act.title}</td>
                      <td className="p-3">
                        <span style={{ backgroundColor: tagColor }} className="px-2 py-0.5 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                          {act.tag}
                        </span>
                      </td>
                      <td className="p-3">{act.estimatedMinutes}</td>
                      <td className="p-3 text-xs font-mono">{act.startTime || '--:--'}</td>
                      <td className="p-3 text-xs font-mono">{act.endTime || '--:--'}</td>
                      <td className={`p-3 font-mono font-bold ${act.isRunning ? 'text-[#4CAF50] animate-pulse' : ''}`}>
                        {formatTime(act.elapsedSeconds)}
                      </td>
                      <td className="p-3 flex justify-end gap-2 print:hidden">
                        <button 
                          onClick={() => toggleTimer(act.id)}
                          className={`p-1.5 rounded ${act.isRunning ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                        >
                          {act.isRunning ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button 
                          onClick={() => openEdit(act)}
                          className="p-1.5 rounded bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => completeActivity(act.id)}
                          className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button 
                          onClick={() => deleteActivity(act.id)}
                          className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Completed History Table */}
      <section className={cardClass}>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="font-semibold text-lg">Histórico de Concluídas</h3>
          <div className="flex gap-2 print:hidden flex-wrap">
            <input 
              type="date" 
              value={reportDateFilter} 
              onChange={(e) => setReportDateFilter(e.target.value)}
              className={`${inputClass} !w-auto text-sm py-1`}
              title="Filtrar por data específica"
            />
            <select 
              value={reportType} 
              onChange={(e) => setReportType(e.target.value as 'week' | 'month')} 
              className={`${inputClass} !w-auto text-sm py-1 font-semibold`}
            >
              <option value="week">Semana Atual</option>
              <option value="month">Mês Atual</option>
            </select>
            <select 
              value={reportDayFilter} 
              onChange={(e) => setReportDayFilter(e.target.value)} 
              className={`${inputClass} !w-auto text-sm py-1`}
            >
              <option value="all">Todos os Dias</option>
              {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
              value={reportTagFilter} 
              onChange={(e) => setReportTagFilter(e.target.value)} 
              className={`${inputClass} !w-auto text-sm py-1`}
            >
              <option value="all">Todas as Tags</option>
              {tags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full min-w-[800px] border-collapse">
            <thead className="sticky top-0 bg-inherit z-10">
              <tr className={`text-left text-xs uppercase opacity-60 border-b ${theme === 'dark' ? 'border-[#2D3139]' : 'border-gray-200'}`}>
                <th className="p-3">Data</th>
                <th className="p-3">Atividade</th>
                <th className="p-3">Tag</th>
                <th className="p-3">Início</th>
                <th className="p-3">Fim</th>
                <th className="p-3">Duração</th>
                <th className="p-3 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody>
               {completedActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center opacity-50 italic">
                    Nenhuma atividade concluída neste período.
                  </td>
                </tr>
              ) : (
                completedActivities.map(act => {
                   const tagColor = tags.find(t => t.name === act.tag)?.color || '#555';
                   return (
                    <tr key={act.id} className={`border-b ${theme === 'dark' ? 'border-[#2D3139]' : 'border-gray-200'}`}>
                      <td className="p-3 text-sm">
                        <div className="text-xs opacity-70">{act.day}</div>
                        {formatDate(act.date)}
                      </td>
                      <td className="p-3 font-medium">{act.title}</td>
                      <td className="p-3">
                         <span style={{ backgroundColor: tagColor }} className="px-2 py-0.5 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                          {act.tag}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-mono">{act.startTime}</td>
                      <td className="p-3 text-xs font-mono">{act.endTime}</td>
                      <td className="p-3 font-mono">{formatTime(act.elapsedSeconds)}</td>
                      <td className="p-3 text-right print:hidden">
                        <button 
                          onClick={() => restoreActivity(act.id)}
                          className="p-1.5 rounded bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
                          title="Restaurar"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </td>
                    </tr>
                   );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Charts */}
      <section className={cardClass}>
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h3 className="font-semibold text-lg">Produtividade</h3>
          <div className="flex gap-2 print:hidden flex-wrap">
            <input 
              type="date" 
              value={chartDateFilter} 
              onChange={(e) => setChartDateFilter(e.target.value)}
              className={`${inputClass} !w-auto text-sm py-1`}
              title="Filtrar por data específica"
            />
            <select 
              value={chartPeriod} 
              onChange={(e) => setChartPeriod(e.target.value as 'week' | 'month')} 
              className={`${inputClass} !w-auto text-sm py-1 font-semibold`}
            >
              <option value="week">Semana Atual</option>
              <option value="month">Mês Atual</option>
            </select>
            <select 
              value={chartDayFilter} 
              onChange={(e) => setChartDayFilter(e.target.value)} 
              className={`${inputClass} !w-auto text-sm py-1`}
            >
              <option value="all">Todos os Dias</option>
              {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
              value={chartTagFilter} 
              onChange={(e) => setChartTagFilter(e.target.value)} 
              className={`${inputClass} !w-auto text-sm py-1`}
            >
              <option value="all">Todas as Tags</option>
              {tags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <StatsChart activities={chartActivities} theme={theme} period={chartPeriod} />
      </section>

      <footer className="text-center opacity-50 text-sm mt-8 pb-8 print:hidden">
        Dados salvos automaticamente no navegador.
      </footer>

      {/* --- Modals --- */}

      {/* New User Modal */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-xl p-6 shadow-xl ${theme === 'dark' ? 'bg-[#1A1F26]' : 'bg-white'}`}>
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Novo Usuário</h3>
              <button onClick={() => setIsNewUserModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
               <div>
                <label className="text-xs opacity-70 mb-1 block">Nome do Usuário</label>
                <input 
                  type="text" 
                  placeholder="Ex: João Silva" 
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button onClick={handleCreateUser} className={`${btnPrimary} w-full flex justify-center items-center gap-2`}>
                <Plus size={16} /> Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tags Modal */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl p-6 shadow-xl ${theme === 'dark' ? 'bg-[#1A1F26]' : 'bg-white'}`}>
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Gerenciar Tags</h3>
              <button onClick={() => setIsTagsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Nome da Tag" 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className={inputClass}
              />
              <input 
                type="color" 
                value={newTagColor}
                onChange={e => setNewTagColor(e.target.value)}
                className="h-10 w-12 p-1 rounded border border-gray-600 bg-transparent cursor-pointer"
              />
              <button onClick={handleAddTag} className={btnPrimary}>+</button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {tags.map(t => (
                <li key={t.name} className="flex justify-between items-center p-2 rounded border border-gray-700/20">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                    {t.name}
                  </span>
                  <button onClick={() => removeTag(t.name)} className="text-red-500 hover:bg-red-500/10 p-1 rounded">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl p-6 shadow-xl ${theme === 'dark' ? 'bg-[#1A1F26]' : 'bg-white'}`}>
             <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Editar Atividade</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs opacity-70">Nome</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs opacity-70">Tag</label>
                 <select 
                    value={editForm.tag} 
                    onChange={e => setEditForm({...editForm, tag: e.target.value})} 
                    className={inputClass}
                  >
                  {tags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs opacity-70">Início</label>
                  <input 
                    type="time" 
                    value={editForm.start} 
                    onChange={e => setEditForm({...editForm, start: e.target.value})}
                    className={inputClass}
                  />
                </div>
                 <div>
                  <label className="text-xs opacity-70">Fim</label>
                  <input 
                    type="time" 
                    value={editForm.end} 
                    onChange={e => setEditForm({...editForm, end: e.target.value})}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button onClick={saveEdit} className={btnPrimary}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-xl p-6 shadow-xl relative ${theme === 'dark' ? 'bg-[#1A1F26]' : 'bg-white'}`}>
            <button onClick={() => setIsAiModalOpen(false)} className="absolute top-4 right-4 opacity-50 hover:opacity-100">
               <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-4 text-purple-500">
              <Sparkles size={24} />
              <h2 className="text-xl font-bold">Análise de Produtividade</h2>
            </div>
             <div className={`rounded-xl p-6 min-h-[200px] ${theme === 'dark' ? 'bg-[#0F1419]' : 'bg-purple-50'}`}>
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-8 space-y-3">
                  <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <p className="text-purple-500 text-sm font-medium animate-pulse">Gerando insights com IA...</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none whitespace-pre-line leading-relaxed opacity-90">
                  {aiAnalysis}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;