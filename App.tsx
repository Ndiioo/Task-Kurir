
import React, { useState, useEffect, useMemo } from 'react';
import { sheetService } from './services/sheetService';
import { AppState, User, Role, Task, Attendance } from './types';
import TaskCard from './components/TaskCard';
import AttendanceTable from './components/AttendanceTable';
import { LogIn, LogOut, ClipboardList, Calendar, Loader2, AlertCircle, LayoutDashboard, RefreshCw, Filter, Search, X, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    tasks: [],
    attendance: [],
    isLoading: false,
    error: null,
  });

  const [loginForm, setLoginForm] = useState({ username: '' });
  const [activeTab, setActiveTab] = useState<'tasks' | 'ops'>('tasks');
  
  const [filters, setFilters] = useState({
    status: 'all',
    hub: 'all',
    courier: 'all',
    shift: 'all',
    search: ''
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('yt_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setState(prev => ({ ...prev, user }));
        fetchDashboardData();
      } catch (e) {
        localStorage.removeItem('yt_user');
      }
    }
  }, []);

  const fetchDashboardData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [tasks, attendance] = await Promise.all([
        sheetService.getTasks(),
        sheetService.getAttendance()
      ]);
      setState(prev => ({ ...prev, tasks, attendance, isLoading: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: `Cloud Error: ${err.message}`, isLoading: false }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputUsername = loginForm.username.trim();
    if (!inputUsername) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const [kurirUsers, opsUsers, allTasks] = await Promise.all([
        sheetService.getCourierLoginData(),
        sheetService.getOpsLoginData(),
        sheetService.getTasks()
      ]);

      const usernameLower = inputUsername.toLowerCase();
      
      const opsMatch = opsUsers.find(u => u.username.toLowerCase() === usernameLower);
      if (opsMatch) {
        performLogin({ username: opsMatch.username, name: opsMatch.name, role: 'ops' });
        return;
      }

      const kurirMatch = kurirUsers.find(u => u.username.toLowerCase() === usernameLower);
      if (kurirMatch) {
        const hasTask = allTasks.some(t => t.courierId.toLowerCase() === usernameLower);
        if (hasTask) {
          performLogin({ username: kurirMatch.username, name: kurirMatch.name, role: 'kurir' });
        } else {
          throw new Error(`Username '${inputUsername}' terdaftar tapi tidak ditemukan tugas aktif di kolom V.`);
        }
        return;
      }

      throw new Error(`Username '${inputUsername}' tidak terdaftar.`);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isLoading: false }));
    }
  };

  const performLogin = (user: User) => {
    localStorage.setItem('yt_user', JSON.stringify(user));
    setState(prev => ({ ...prev, user, isLoading: false, error: null }));
    fetchDashboardData();
  };

  const handleLogout = () => {
    localStorage.removeItem('yt_user');
    setState({
      user: null,
      tasks: [],
      attendance: [],
      isLoading: false,
      error: null,
    });
  };

  const handleFinishTask = (taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.taskId === taskId ? { ...t, status: 'finished' } : t)
    }));
  };

  const filterOptions = useMemo(() => {
    const hubs = Array.from(new Set(state.tasks.map(t => t.hub))).filter(Boolean).sort();
    const couriers = Array.from(new Set(state.tasks.map(t => t.name))).filter(Boolean).sort();
    const shifts = Array.from(new Set(state.attendance.map(a => a.shift))).filter(Boolean).sort();
    return { hubs, couriers, shifts };
  }, [state.tasks, state.attendance]);

  const groupedTasks = useMemo(() => {
    if (!state.user) return [];
    
    let filtered = state.user.role === 'ops' 
      ? state.tasks 
      : state.tasks.filter(t => t.courierId.toLowerCase() === state.user?.username.toLowerCase());
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => (t.status || 'pending') === filters.status);
    }
    if (filters.hub !== 'all') {
      filtered = filtered.filter(t => t.hub === filters.hub);
    }
    if (filters.courier !== 'all') {
      filtered = filtered.filter(t => t.name === filters.courier);
    }
    if (filters.search && activeTab === 'tasks') {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.taskId.toLowerCase().includes(searchLower) || 
        t.fmsId.toLowerCase().includes(searchLower) ||
        t.name.toLowerCase().includes(searchLower)
      );
    }
    
    const groups: Record<string, Task[]> = {};
    filtered.forEach(task => {
      const key = task.fmsId || 'TANPA-FMS';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return Object.entries(groups);
  }, [state.tasks, state.user, filters, activeTab]);

  const filteredAttendance = useMemo(() => {
    let filtered = [...state.attendance];
    if (filters.shift !== 'all') {
      filtered = filtered.filter(a => a.shift === filters.shift);
    }
    if (filters.search && activeTab === 'ops') {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.staffName.toLowerCase().includes(searchLower) ||
        a.jabatan.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [state.attendance, filters, activeTab]);

  const resetFilters = () => setFilters({ status: 'all', hub: 'all', courier: 'all', shift: 'all', search: '' });

  if (!state.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center p-3">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-5">
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <LayoutDashboard size={28} className="text-blue-600" />
              </div>
            </div>
            <h1 className="text-xl font-black text-center text-gray-800 mb-0.5 uppercase tracking-tighter">Your Task</h1>
            <p className="text-center text-gray-400 mb-5 text-[9px] font-bold italic tracking-wider">LOGISTICS SYSTEM</p>
            
            {state.error && (
              <div className="mb-3 p-2 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-2 rounded-r-lg">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p className="text-[9px] font-black">{state.error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-2.5">
              <div>
                <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5 px-1">Login User ID</label>
                <div className="relative">
                  <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ username: e.target.value })}
                    placeholder="Masukkan ID anda"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-100 bg-gray-50 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-bold text-[12px] text-gray-700"
                    disabled={state.isLoading}
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={state.isLoading}
                className="w-full bg-blue-600 text-white font-black py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 text-[12px] uppercase"
              >
                {state.isLoading ? <Loader2 className="animate-spin" size={14} /> : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-2 h-10 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="bg-blue-600 p-1 rounded-sm shadow-sm">
              <LayoutDashboard size={12} className="text-white sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-[10px] sm:text-lg font-black tracking-tighter text-gray-900 uppercase">YOUR TASK</h1>
          </div>
          
          <div className="flex items-center gap-0.5">
            <button 
              onClick={fetchDashboardData}
              disabled={state.isLoading}
              className={`p-1 text-gray-400 hover:text-blue-600 rounded transition-all ${state.isLoading ? 'animate-spin text-blue-600' : ''}`}
            >
              <RefreshCw size={12} className="sm:w-5 sm:h-5" />
            </button>
            <div className="h-3 w-px bg-gray-100 mx-0.5"></div>
            <button 
              onClick={handleLogout}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-all"
            >
              <LogOut size={12} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-2 pb-20">
        {state.error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-100 text-red-700 flex items-center gap-2 rounded-lg">
            <AlertCircle size={14} className="flex-shrink-0" />
            <p className="text-[8px] font-black uppercase">{state.error}</p>
          </div>
        )}

        <div className="mb-3 flex flex-col md:flex-row md:items-end justify-between gap-2 px-1">
          <div className="animate-in slide-in-from-left duration-300">
            <p className="text-blue-600 font-black text-[7px] uppercase tracking-widest mb-0">OVERVIEW</p>
            <h2 className="text-[14px] sm:text-4xl font-black text-gray-900 leading-tight uppercase">Halo, {state.user.name}!</h2>
            <div className="flex items-center gap-1 mt-0">
              <span className={`px-1 rounded-[2px] text-[6px] font-black uppercase tracking-tighter ${
                state.user.role === 'kurir' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              }`}>
                {state.user.role}
              </span>
              <p className="text-gray-400 text-[7px] font-bold uppercase">ID: {state.user.username}</p>
            </div>
          </div>
          
          <div className="flex p-0.5 bg-gray-200/50 rounded-md w-full sm:w-fit">
             <button 
              onClick={() => { setActiveTab('tasks'); resetFilters(); }}
              className={`flex items-center justify-center gap-1 flex-1 sm:flex-none px-2 py-1 rounded-[4px] font-black transition-all text-[8px] sm:text-sm ${
                activeTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <ClipboardList size={10} className="sm:w-[18px] sm:h-[18px]" /> TASK
            </button>
            <button 
              onClick={() => { setActiveTab('ops'); resetFilters(); }}
              className={`flex items-center justify-center gap-1 flex-1 sm:flex-none px-2 py-1 rounded-[4px] font-black transition-all text-[8px] sm:text-sm ${
                activeTab === 'ops' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Calendar size={10} className="sm:w-[18px] sm:h-[18px]" /> JADWAL
            </button>
          </div>
        </div>

        {state.isLoading && (state.tasks.length === 0 || state.attendance.length === 0) ? (
          <div className="bg-white rounded-lg p-8 flex flex-col items-center justify-center border border-gray-50">
            <Loader2 className="animate-spin text-blue-600" size={20} />
            <p className="mt-2 text-gray-400 font-black text-[7px] uppercase tracking-widest">Memuat Cloud...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {activeTab === 'tasks' && (
              <div className="space-y-1.5">
                <div className="bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1 text-gray-800 font-black text-[7px] uppercase tracking-tighter">
                      <Filter size={8} className="text-blue-600" /> Filter
                    </div>
                    <button onClick={resetFilters} className="text-[6px] font-black text-gray-400 uppercase flex items-center gap-0.5">
                      <X size={6} /> Reset
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 sm:gap-3">
                    <div className="relative col-span-2">
                      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400" size={8} />
                      <input 
                        type="text"
                        placeholder="Cari ID / FMS..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="w-full pl-5 pr-1 py-1 bg-gray-50 border border-gray-100 rounded text-[8px] font-bold outline-none"
                      />
                    </div>
                    <select 
                      value={filters.status}
                      onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-1 py-1 bg-gray-50 border border-gray-100 rounded text-[8px] font-bold outline-none"
                    >
                      <option value="all">STATUS</option>
                      <option value="pending">PENDING</option>
                      <option value="finished">FINISHED</option>
                    </select>
                    <select 
                      value={filters.hub}
                      onChange={(e) => setFilters(f => ({ ...f, hub: e.target.value }))}
                      className="w-full px-1 py-1 bg-gray-50 border border-gray-100 rounded text-[8px] font-bold outline-none"
                    >
                      <option value="all">HUB</option>
                      {filterOptions.hubs.map(hub => <option key={hub} value={hub}>{hub.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1 mt-2">
                  <h3 className="text-[8px] font-black text-gray-800 uppercase tracking-tighter">DAFTAR TUGAS</h3>
                  <div className="bg-blue-600 text-white px-1 py-0.5 rounded-[2px] text-[6px] font-black uppercase">
                    {groupedTasks.length} GRUP
                  </div>
                </div>
                
                <div className="grid gap-1">
                  {groupedTasks.map(([fmsId, tasks]) => (
                    <TaskCard key={fmsId} fmsId={fmsId} tasks={tasks} onFinishTask={handleFinishTask} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ops' && (
              <div className="space-y-1.5">
                <div className="bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm space-y-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="relative">
                      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400" size={8} />
                      <input 
                        type="text"
                        placeholder="Cari Nama..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="w-full pl-5 pr-1 py-1 bg-gray-50 border border-gray-100 rounded text-[8px] font-bold outline-none"
                      />
                    </div>
                    <select 
                      value={filters.shift}
                      onChange={(e) => setFilters(f => ({ ...f, shift: e.target.value }))}
                      className="w-full px-1 py-1 bg-gray-50 border border-gray-100 rounded text-[8px] font-bold outline-none"
                    >
                      <option value="all">SEMUA SHIFT</option>
                      {filterOptions.shifts.map(shift => <option key={shift} value={shift}>{shift.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <AttendanceTable data={filteredAttendance} />
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-2 left-2 right-2 bg-white/95 backdrop-blur-md border border-gray-200 p-1 flex justify-around shadow-lg rounded-lg z-40">
        <button 
          onClick={() => { setActiveTab('tasks'); resetFilters(); }}
          className={`flex flex-col items-center flex-1 py-1 rounded-md transition-all ${
            activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          <ClipboardList size={14} />
          <span className="text-[6px] font-black mt-0.5 uppercase">Task</span>
        </button>
        <button 
          onClick={() => { setActiveTab('ops'); resetFilters(); }}
          className={`flex flex-col items-center flex-1 py-1 rounded-md transition-all ${
            activeTab === 'ops' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          <Calendar size={14} />
          <span className="text-[6px] font-black mt-0.5 uppercase">Jadwal</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
