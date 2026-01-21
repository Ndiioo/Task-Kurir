
import React, { useState, useEffect, useMemo } from 'react';
import { sheetService } from './services/sheetService';
import { AppState, User, Role, Task, Attendance } from './types';
import TaskCard from './components/TaskCard';
import AttendanceTable from './components/AttendanceTable';
import { LogIn, LogOut, ClipboardList, Calendar, Loader2, AlertCircle, LayoutDashboard, RefreshCw, Info, Filter, Search, X, Clock } from 'lucide-react';

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
      setState(prev => ({ ...prev, error: err.message, isLoading: false }));
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
          throw new Error(`Username '${inputUsername}' terdaftar sebagai Kurir, tetapi tidak ditemukan di daftar task.`);
        }
        return;
      }

      throw new Error(`Username '${inputUsername}' tidak terdaftar di sistem.`);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isLoading: false }));
    }
  };

  const performLogin = (user: User) => {
    localStorage.setItem('yt_user', JSON.stringify(user));
    setState(prev => ({ ...prev, user, isLoading: false }));
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
      <div className="min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <LayoutDashboard size={32} className="text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-center text-gray-800 mb-1">Your Task</h1>
            <p className="text-center text-gray-400 mb-6 text-xs font-medium italic">Integrated Logistics System</p>
            
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-2 rounded-r-lg">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold">{state.error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">Username</label>
                <div className="relative">
                  <LogIn className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ username: e.target.value })}
                    placeholder="Username login anda"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-bold text-sm text-gray-700"
                    disabled={state.isLoading}
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={state.isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                {state.isLoading ? <Loader2 className="animate-spin" size={16} /> : 'MASUK'}
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
        <div className="max-w-6xl mx-auto px-2 sm:px-4 h-12 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="bg-blue-600 p-1 rounded-md sm:rounded-xl shadow-md">
              <LayoutDashboard size={14} className="text-white sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-[11px] sm:text-lg font-black tracking-tighter text-gray-900 uppercase">YOUR TASK</h1>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-2">
            <button 
              onClick={fetchDashboardData}
              disabled={state.isLoading}
              className={`p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all ${state.isLoading ? 'animate-spin text-blue-600' : ''}`}
            >
              <RefreshCw size={14} className="sm:w-5 sm:h-5" />
            </button>
            <div className="h-3 w-px bg-gray-200 mx-0.5 sm:h-5"></div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut size={14} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-8 pb-20">
        <div className="mb-3 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6">
          <div className="animate-in slide-in-from-left duration-300 px-1">
            <p className="text-blue-600 font-black text-[8px] sm:text-xs uppercase tracking-[0.2em] mb-0">Dashboard</p>
            <h2 className="text-sm sm:text-4xl font-black text-gray-900 leading-tight">Halo, {state.user.name}!</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`px-1 py-0.5 rounded-[4px] text-[7px] sm:text-[10px] font-black uppercase tracking-wider ${
                state.user.role === 'kurir' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              }`}>
                {state.user.role}
              </span>
              <p className="text-gray-400 text-[8px] sm:text-sm font-bold uppercase tracking-tighter">Verified User</p>
            </div>
          </div>
          
          <div className="flex p-0.5 bg-gray-200/50 rounded-lg sm:rounded-2xl w-full sm:w-fit">
             <button 
              onClick={() => { setActiveTab('tasks'); resetFilters(); }}
              className={`flex items-center justify-center gap-1 flex-1 sm:flex-none px-2 sm:px-6 py-1.5 sm:py-3 rounded-[6px] sm:rounded-xl font-black transition-all text-[9px] sm:text-sm ${
                activeTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <ClipboardList size={11} className="sm:w-[18px] sm:h-[18px]" /> TASK
            </button>
            <button 
              onClick={() => { setActiveTab('ops'); resetFilters(); }}
              className={`flex items-center justify-center gap-1 flex-1 sm:flex-none px-2 sm:px-6 py-1.5 sm:py-3 rounded-[6px] sm:rounded-xl font-black transition-all text-[9px] sm:text-sm ${
                activeTab === 'ops' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Calendar size={11} className="sm:w-[18px] sm:h-[18px]" /> JADWAL
            </button>
          </div>
        </div>

        {state.isLoading && (state.tasks.length === 0 || state.attendance.length === 0) ? (
          <div className="bg-white rounded-xl p-10 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <p className="mt-2 text-gray-500 font-black tracking-widest text-[8px] uppercase">Sinkronisasi...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeTab === 'tasks' && (
              <div className="space-y-2 sm:space-y-6">
                <div className="bg-white p-2 rounded-lg sm:rounded-3xl border border-gray-100 shadow-sm space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1 text-gray-800 font-black text-[8px] sm:text-sm uppercase tracking-tight">
                      <Filter size={10} className="text-blue-600 sm:w-4 sm:h-4" /> Filter
                    </div>
                    <button onClick={resetFilters} className="text-[7px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-0.5">
                      <X size={8} /> Reset
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-3">
                    <div className="relative col-span-2 sm:col-span-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                      <input 
                        type="text"
                        placeholder="ID / FMS..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="w-full pl-6 pr-1 py-1 sm:py-2.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] sm:text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <select 
                      value={filters.status}
                      onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-1 sm:px-3 py-1 sm:py-2.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] sm:text-xs font-bold outline-none appearance-none"
                    >
                      <option value="all">STATUS</option>
                      <option value="pending">PENDING</option>
                      <option value="finished">FINISHED</option>
                    </select>
                    <select 
                      value={filters.hub}
                      onChange={(e) => setFilters(f => ({ ...f, hub: e.target.value }))}
                      className="w-full px-1 sm:px-3 py-1 sm:py-2.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] sm:text-xs font-bold outline-none appearance-none"
                    >
                      <option value="all">HUB</option>
                      {filterOptions.hubs.map(hub => <option key={hub} value={hub}>{hub.toUpperCase()}</option>)}
                    </select>
                    <select 
                      value={filters.courier}
                      onChange={(e) => setFilters(f => ({ ...f, courier: e.target.value }))}
                      disabled={state.user.role === 'kurir'}
                      className={`w-full px-1 sm:px-3 py-1 sm:py-2.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] sm:text-xs font-bold outline-none appearance-none disabled:opacity-30 ${state.user.role === 'ops' ? 'col-span-2 lg:col-span-1' : ''}`}
                    >
                      <option value="all">KURIR</option>
                      {filterOptions.couriers.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[9px] sm:text-xl font-black text-gray-800 uppercase tracking-tight">Daftar Task</h3>
                  <div className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[7px] sm:text-[10px] font-black">
                    {groupedTasks.length} GRUP
                  </div>
                </div>
                
                <div className="grid gap-1.5 sm:gap-6">
                  {groupedTasks.map(([fmsId, tasks]) => (
                    <TaskCard key={fmsId} fmsId={fmsId} tasks={tasks} onFinishTask={handleFinishTask} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ops' && (
              <div className="space-y-2 sm:space-y-6">
                <div className="bg-white p-2 rounded-lg sm:rounded-3xl border border-gray-100 shadow-sm space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1 text-gray-800 font-black text-[8px] sm:text-sm uppercase tracking-tight">
                      <Clock size={10} className="text-blue-600 sm:w-4 sm:h-4" /> Filter Jadwal
                    </div>
                    <button onClick={resetFilters} className="text-[7px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-0.5">
                      <X size={8} /> Reset
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 sm:gap-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                      <input 
                        type="text"
                        placeholder="Cari Nama..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="w-full pl-6 pr-1 py-1 sm:py-2.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] sm:text-xs font-bold outline-none"
                      />
                    </div>
                    <select 
                      value={filters.shift}
                      onChange={(e) => setFilters(f => ({ ...f, shift: e.target.value }))}
                      className="w-full px-1 sm:px-3 py-1 sm:py-2.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] sm:text-xs font-bold outline-none appearance-none"
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

      <nav className="md:hidden fixed bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md border border-gray-200/50 p-1 flex justify-around shadow-xl rounded-xl z-40">
        <button 
          onClick={() => { setActiveTab('tasks'); resetFilters(); }}
          className={`flex flex-col items-center flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          <ClipboardList size={16} />
          <span className="text-[7px] font-black mt-0.5 uppercase">Task</span>
        </button>
        <button 
          onClick={() => { setActiveTab('ops'); resetFilters(); }}
          className={`flex flex-col items-center flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'ops' ? 'bg-blue-600 text-white' : 'text-gray-400'
          }`}
        >
          <Calendar size={16} />
          <span className="text-[7px] font-black mt-0.5 uppercase">Jadwal</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
