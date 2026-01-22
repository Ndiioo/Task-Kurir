import React, { useState, useEffect, useMemo } from 'react';
import { sheetService } from './services/sheetService';
import { AppState, User, Task, Attendance } from './types';
import TaskCard from './components/TaskCard';
import AttendanceTable from './components/AttendanceTable';
import { LogIn, LogOut, ClipboardList, Calendar, Loader2, AlertCircle, LayoutDashboard, RefreshCw, Filter, Search, X, Info, ChevronDown, ChevronUp, Warehouse, Package, BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    tasks: [],
    attendance: [],
    isLoading: false,
    error: null,
  });

  const [loginForm, setLoginForm] = useState({ username: '' });
  const [activeTab, setActiveTab] = useState<'tasks' | 'ops' | 'station'>('tasks');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
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
          throw new Error(`Username '${inputUsername}' terdaftar tapi tidak ditemukan tugas aktif.`);
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
    const shifts = Array.from(new Set(state.attendance.map(a => a.shift))).filter(Boolean).sort();
    return { hubs, shifts };
  }, [state.tasks, state.attendance]);

  const stationStats = useMemo(() => {
    const stats: Record<string, { hub: string, totalPackages: number, totalTasks: number }> = {};
    state.tasks.forEach(task => {
      const hubName = task.hub || 'TIDAK TERDEFINISI';
      if (!stats[hubName]) {
        stats[hubName] = { hub: hubName, totalPackages: 0, totalTasks: 0 };
      }
      stats[hubName].totalPackages += task.packageCount;
      stats[hubName].totalTasks += 1;
    });
    return Object.values(stats).sort((a, b) => b.totalPackages - a.totalPackages);
  }, [state.tasks]);

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
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="p-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <LayoutDashboard size={32} className="text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-center text-gray-900 mb-1 uppercase tracking-tighter">Your Task</h1>
            <p className="text-center text-gray-400 mb-6 text-[10px] font-bold italic tracking-widest">LOGISTICS SYSTEM v1.0</p>
            
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-2 rounded-r-lg animate-in slide-in-from-top">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold uppercase">{state.error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">Login User ID</label>
                <div className="relative">
                  <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ username: e.target.value })}
                    placeholder="Masukkan ID anda"
                    className="w-full pl-10 pr-4 py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-sm text-gray-700 transition-all"
                    disabled={state.isLoading}
                    autoFocus
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={state.isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm uppercase transition-all active:scale-[0.98]"
              >
                {state.isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Masuk Ke Sistem'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Sticky Top Section (Header + Marquee) */}
      <div className="sticky top-0 z-50">
        <header className="bg-white border-b border-gray-100 shadow-sm px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-md">
              <LayoutDashboard size={16} className="text-white sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-sm sm:text-xl font-black tracking-tighter text-gray-900 uppercase">YOUR TASK</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchDashboardData}
              disabled={state.isLoading}
              className={`p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all ${state.isLoading ? 'animate-spin text-blue-600' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw size={18} className="sm:w-5 sm:h-5" />
            </button>
            <div className="h-6 w-px bg-gray-100 mx-1"></div>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Pinned Running Text Feeds */}
        <div className="bg-blue-600 border-b border-blue-700 py-1.5 sm:py-2 overflow-hidden marquee-container relative">
          <div className="flex items-center">
            <div className="absolute left-0 top-0 bottom-0 px-3 bg-blue-600 z-20 flex items-center border-r border-blue-500/30 shadow-[4px_0_12px_rgba(0,0,0,0.1)]">
               <Info size={12} className="text-white sm:w-4 sm:h-4 animate-pulse" />
            </div>
            <div className="animate-marquee whitespace-nowrap pl-[100%] inline-block">
              <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-widest flex items-center">
                <span className="mx-4">Update Data Jam 18:00, 01:00 dan 07:00 atau setelah proses Assign selesai</span>
                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full mx-2"></span>
                <span className="mx-4">Harap Informasikan Ke Shift Lead atau PIC Hub jika terdapat tidak kesesuaian Data</span>
                <span className="w-1.5 h-1.5 bg-blue-300 rounded-full mx-2"></span>
                <span className="mx-4">Terima Kasih</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24">
        {state.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 flex items-center gap-3 rounded-xl animate-in fade-in duration-300">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-tight">{state.error}</p>
          </div>
        )}

        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
          <div className="animate-in slide-in-from-left duration-500">
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-1">DASHBOARD OVERVIEW</p>
            <h2 className="text-xl sm:text-3xl font-black text-gray-900 leading-tight uppercase">Halo, {state.user.name}!</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm ${
                state.user.role === 'kurir' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {state.user.role}
              </span>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">ID AKUN: {state.user.username}</p>
            </div>
          </div>
          
          <div className="flex p-1 bg-gray-200/50 rounded-xl w-full sm:w-fit backdrop-blur-sm overflow-x-auto no-scrollbar">
             <button 
              onClick={() => { setActiveTab('tasks'); resetFilters(); }}
              className={`flex items-center justify-center gap-2 flex-shrink-0 px-4 sm:px-6 py-2 rounded-lg font-black transition-all text-xs sm:text-sm ${
                activeTab === 'tasks' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardList size={16} className="sm:w-[18px] sm:h-[18px]" /> TUGAS
            </button>
            <button 
              onClick={() => { setActiveTab('station'); resetFilters(); }}
              className={`flex items-center justify-center gap-2 flex-shrink-0 px-4 sm:px-6 py-2 rounded-lg font-black transition-all text-xs sm:text-sm ${
                activeTab === 'station' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" /> STATION
            </button>
            <button 
              onClick={() => { setActiveTab('ops'); resetFilters(); }}
              className={`flex items-center justify-center gap-2 flex-shrink-0 px-4 sm:px-6 py-2 rounded-lg font-black transition-all text-xs sm:text-sm ${
                activeTab === 'ops' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" /> JADWAL
            </button>
          </div>
        </div>

        {state.isLoading && (state.tasks.length === 0 || state.attendance.length === 0) ? (
          <div className="bg-white rounded-2xl p-16 flex flex-col items-center justify-center border border-gray-100 shadow-sm animate-pulse">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
            <p className="text-gray-400 font-black text-xs uppercase tracking-[0.3em]">Sinkronisasi Cloud...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300">
                  <div 
                    className="flex items-center justify-between px-1 cursor-pointer select-none"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                  >
                    <div className="flex items-center gap-2 text-gray-800 font-black text-xs uppercase tracking-tighter">
                      <Filter size={14} className="text-blue-600" /> Filter Pencarian
                      {isFilterOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); resetFilters(); }} 
                      className="text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase flex items-center gap-1 transition-colors"
                    >
                      <X size={12} /> Reset Filter
                    </button>
                  </div>
                  
                  <div className={`grid overflow-hidden transition-all duration-300 ${isFilterOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] mt-0 opacity-0'}`}>
                    <div className="min-h-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text"
                          placeholder="Cari ID Task / FMS..."
                          value={filters.search}
                          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                        />
                      </div>
                      <select 
                        value={filters.status}
                        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="all">SEMUA STATUS</option>
                        <option value="pending">PENDING</option>
                        <option value="finished">FINISHED</option>
                      </select>
                      <select 
                        value={filters.hub}
                        onChange={(e) => setFilters(f => ({ ...f, hub: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="all">SEMUA HUB</option>
                        {filterOptions.hubs.map(hub => <option key={hub} value={hub}>{hub.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 mt-6">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Daftar Paket Task</h3>
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg shadow-blue-200">
                    {groupedTasks.length} Grup Aktif
                  </div>
                </div>
                
                <div className="grid gap-3">
                  {groupedTasks.length > 0 ? (
                    groupedTasks.map(([fmsId, tasks]) => (
                      <TaskCard key={fmsId} fmsId={fmsId} tasks={tasks} onFinishTask={handleFinishTask} />
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                      <p className="text-gray-400 font-black text-xs uppercase italic">Tidak Ada Data Ditemukan</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'station' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stationStats.map((stat) => (
                    <div key={stat.hub} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Warehouse size={64} className="text-blue-600" />
                      </div>
                      <div className="relative z-10">
                        <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1">STATION / HUB</p>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter mb-4">{stat.hub}</h3>
                        
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-400 mb-0.5">
                              <Package size={14} className="text-orange-500" />
                              <span className="text-[10px] font-black uppercase tracking-tight">Total Paket</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900 leading-none">{stat.totalPackages.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5 text-gray-400 mb-0.5">
                              <ClipboardList size={14} className="text-blue-500" />
                              <span className="text-[10px] font-black uppercase tracking-tight">Task Aktif</span>
                            </div>
                            <p className="text-xl font-black text-gray-700 leading-none">{stat.totalTasks.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${Math.min(100, (stat.totalPackages / 500) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                {stationStats.length === 0 && (
                   <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 font-black text-xs uppercase italic">Data Station Belum Tersedia</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ops' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300">
                  <div 
                    className="flex items-center justify-between px-1 cursor-pointer select-none"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                  >
                    <div className="flex items-center gap-2 text-gray-800 font-black text-xs uppercase tracking-tighter">
                      <Filter size={14} className="text-blue-600" /> Filter Jadwal
                      {isFilterOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); resetFilters(); }} 
                      className="text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase flex items-center gap-1 transition-colors"
                    >
                      <X size={12} /> Reset Filter
                    </button>
                  </div>
                  
                  <div className={`grid overflow-hidden transition-all duration-300 ${isFilterOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] mt-0 opacity-0'}`}>
                    <div className="min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                          type="text"
                          placeholder="Cari Nama Staff..."
                          value={filters.search}
                          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                        />
                      </div>
                      <select 
                        value={filters.shift}
                        onChange={(e) => setFilters(f => ({ ...f, shift: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="all">SEMUA SHIFT</option>
                        {filterOptions.shifts.map(shift => <option key={shift} value={shift}>{shift.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <AttendanceTable data={filteredAttendance} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation Mobile Fixed */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/20 p-2 flex justify-around shadow-2xl rounded-2xl z-40 ring-1 ring-black/5">
        <button 
          onClick={() => { setActiveTab('tasks'); setIsFilterOpen(false); resetFilters(); }}
          className={`flex flex-col items-center flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-4px]' : 'text-gray-400'
          }`}
        >
          <ClipboardList size={20} />
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Task List</span>
        </button>
        <button 
          onClick={() => { setActiveTab('station'); setIsFilterOpen(false); resetFilters(); }}
          className={`flex flex-col items-center flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'station' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-4px]' : 'text-gray-400'
          }`}
        >
          <BarChart3 size={20} />
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Station</span>
        </button>
        <button 
          onClick={() => { setActiveTab('ops'); setIsFilterOpen(false); resetFilters(); }}
          className={`flex flex-col items-center flex-1 py-2 rounded-xl transition-all duration-300 ${
            activeTab === 'ops' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-4px]' : 'text-gray-400'
          }`}
        >
          <Calendar size={20} />
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Jadwal Hub</span>
        </button>
      </nav>
    </div>
  );
};

export default App;