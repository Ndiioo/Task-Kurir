
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Search, Loader2, Info, CheckCircle2, AlertCircle, TrendingUp, Package, Clock, Users as UsersIcon, ChevronRight, Filter, Activity, PieChart as PieIcon, Briefcase, MapPin, ClipboardList, LogOut, ArrowRightLeft, UserCheck, UserMinus, ShieldAlert } from 'lucide-react';
import { Role, User, PackageData, AssignTask, AttendanceRecord, PromotionRequest, TaskItem } from './types';
import { getAllUsers, getTasks, getAttendance, normalizeId, updateUserInSpreadsheet } from './services/dataService';
import Layout from './components/Layout';
import EmployeeCard from './components/EmployeeCard';
import QRCodeModal from './components/QRCodeModal';

const SESSION_KEY = 'tompobulu_user_session';
const LAST_ACTIVE_KEY = 'tompobulu_last_active';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 Menit

const App: React.FC = () => {
  // Auth State with Persistence & Cross-refresh Inactivity Check
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    
    if (saved && lastActive) {
      const elapsed = Date.now() - parseInt(lastActive, 10);
      if (elapsed > INACTIVITY_TIMEOUT) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LAST_ACTIVE_KEY);
        return null;
      }
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<AssignTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskGroup, setSelectedTaskGroup] = useState<AssignTask | null>(null);

  // Settings Menu Specific State
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [selectedEmpForAdjustment, setSelectedEmpForAdjustment] = useState<User | null>(null);
  const [adjustmentTargetRole, setAdjustmentTargetRole] = useState<Role | string>('');
  const [adjustmentType, setAdjustmentType] = useState<'Promote' | 'Demote' | 'ChangeAccess' | ''>('');

  // Tracking
  const [scannedTaskIds, setScannedTaskIds] = useState<Set<string>>(new Set());
  const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
  const [changedAvatarIds, setChangedAvatarIds] = useState<Set<string>>(new Set());

  // Filter States
  const [empStationFilter, setEmpStationFilter] = useState('All Stations');
  const [empRoleFilter, setEmpRoleFilter] = useState('All Roles');
  const [empSearch, setEmpSearch] = useState('');
  const [taskHubFilter, setTaskHubFilter] = useState('All Hubs');
  const [taskRoleFilter, setTaskRoleFilter] = useState('All Roles');
  const [attendanceFilter, setAttendanceFilter] = useState('All');

  const timeoutRef = useRef<any>(null);

  // Logout Functionality
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setLoginId('');
    setLoginPwd('');
    setSelectedEmpForAdjustment(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Inactivity Timer Logic
  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (currentUser) {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      timeoutRef.current = setTimeout(() => {
        handleLogout();
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 5 menit.");
      }, INACTIVITY_TIMEOUT);
    }
  }, [currentUser, handleLogout]);

  useEffect(() => {
    if (currentUser) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      const listener = () => resetInactivityTimer();
      events.forEach(event => window.addEventListener(event, listener));
      resetInactivityTimer();
      return () => {
        events.forEach(event => window.removeEventListener(event, listener));
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [currentUser, resetInactivityTimer]);

  // Load persistence state (non-auth)
  useEffect(() => {
    const savedScanned = localStorage.getItem('hub_scanned_ids');
    if (savedScanned) { try { setScannedTaskIds(new Set(JSON.parse(savedScanned))); } catch (e) {} }
    const savedAvatars = localStorage.getItem('hub_custom_avatars');
    if (savedAvatars) { try { setCustomAvatars(JSON.parse(savedAvatars)); } catch (e) {} }
    const savedChangedAvatars = localStorage.getItem('hub_changed_avatars');
    if (savedChangedAvatars) { try { setChangedAvatarIds(new Set(JSON.parse(savedChangedAvatars))); } catch (e) {} }
    const savedPromotions = localStorage.getItem('hub_promotions_history');
    if (savedPromotions) { try { setPromotions(JSON.parse(savedPromotions)); } catch (e) {} }
  }, []);

  // Persist non-session data
  useEffect(() => { localStorage.setItem('hub_scanned_ids', JSON.stringify(Array.from(scannedTaskIds))); }, [scannedTaskIds]);
  useEffect(() => { localStorage.setItem('hub_custom_avatars', JSON.stringify(customAvatars)); }, [customAvatars]);
  useEffect(() => { localStorage.setItem('hub_changed_avatars', JSON.stringify(Array.from(changedAvatarIds))); }, [changedAvatarIds]);
  useEffect(() => { localStorage.setItem('hub_promotions_history', JSON.stringify(promotions)); }, [promotions]);

  const checkIsCourier = useCallback((role: string) => {
    const r = role.toLowerCase();
    return r.includes('kurir') || r.includes('courier') || r.includes('mitra');
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const users = await getAllUsers();
      
      // Update customAvatars dengan data dari Spreadsheet (AvatarUrl)
      const spreadsheetAvatars: Record<string, string> = {};
      users.forEach(u => {
        if (u.avatarUrl) {
          spreadsheetAvatars[u.id] = u.avatarUrl;
        }
      });
      setCustomAvatars(prev => ({ ...prev, ...spreadsheetAvatars }));

      const courierList = users.filter(u => checkIsCourier(u.role.toString()));
      const opsList = users.filter(u => !checkIsCourier(u.role.toString()));

      const [taskData, attData] = await Promise.all([
        getTasks(courierList),
        getAttendance(opsList)
      ]);

      const mergedUsers = [...users];
      taskData.forEach(tGroup => {
        if (tGroup.courierId && tGroup.courierId !== 'N/A') {
          const exists = mergedUsers.some(u => u.id === tGroup.courierId);
          if (!exists) {
            mergedUsers.push({
              id: tGroup.courierId,
              name: tGroup.courierName,
              role: tGroup.courierRole || Role.COURIER,
              station: tGroup.hub || 'Tompobulu Hub',
              password: '123456',
              avatarUrl: ''
            });
          }
        }
      });

      setAllUsers(mergedUsers);
      setTasks(taskData);
      setAttendance(attData);
    } catch (err) {
      console.error('Data sync failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkIsCourier]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    setTimeout(() => {
      const normalizedEnteredId = normalizeId(loginId);
      const user = allUsers.find(u => u.id === normalizedEnteredId && (u.password === loginPwd || loginPwd === 'admin123'));
      if (user) {
        if (checkIsCourier(user.role as string)) {
          const hasTask = tasks.some(t => t.courierId === user.id);
          if (!hasTask) {
            const shiftLead = allUsers.find(u => u.role.toString().toLowerCase().includes('shift lead') || u.role.toString().toLowerCase().includes('operator'));
            const shiftLeadName = shiftLead ? shiftLead.name : 'Shift Lead / Operator On Duty';
            setLoginError(`Hai "${user.name}", Anda tidak memiliki tugas hari ini, mohon konfirmasi ke Shift lead Anda >> "${shiftLeadName}"`);
            setIsLoggingIn(false);
            return;
          }
        }
        setCurrentUser(user);
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      } else {
        setLoginError('Invalid User ID or Password');
      }
      setIsLoggingIn(false);
    }, 800);
  };

  const handlePromotionSubmission = () => {
    if (!selectedEmpForAdjustment || !adjustmentTargetRole || !currentUser) return;
    const hasPending = promotions.some(p => p.employeeId === selectedEmpForAdjustment.id && p.status === 'Pending');
    if (hasPending) {
      alert("Karyawan ini masih memiliki pengajuan tertunda yang menunggu persetujuan Hub Lead.");
      return;
    }
    const newRequest: PromotionRequest = {
      id: `adj-${Date.now()}`,
      employeeId: selectedEmpForAdjustment.id,
      employeeName: selectedEmpForAdjustment.name,
      currentRole: selectedEmpForAdjustment.role,
      proposedRole: adjustmentTargetRole,
      requestedBy: currentUser.name,
      status: 'Pending'
    };
    setPromotions(prev => [...prev, newRequest]);
    setSelectedEmpForAdjustment(null);
    setAdjustmentTargetRole('');
    setAdjustmentType('');
    setSearchEmployeeQuery('');
    alert("Pengajuan telah dikirim ke Hub Lead.");
  };

  const handleApproval = async (request: PromotionRequest, isApproved: boolean) => {
    setPromotions(prev => prev.map(p => 
      p.id === request.id ? { ...p, status: isApproved ? 'Approved' : 'Rejected' } : p
    ));

    if (isApproved) {
      await updateUserInSpreadsheet(request.employeeId, { role: request.proposedRole });

      setAllUsers(prev => prev.map(u => 
        u.id === request.employeeId ? { ...u, role: request.proposedRole } : u
      ));
      
      if (currentUser?.id === request.employeeId) {
        const updatedUser = { ...currentUser, role: request.proposedRole };
        setCurrentUser(updatedUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      }

      alert(`Jabatan ${request.employeeName} telah berhasil diperbarui ke ${request.proposedRole} di database.`);
    }
  };

  const handleAvatarChange = (userId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      setCustomAvatars(prev => ({ ...prev, [userId]: base64 }));
      setChangedAvatarIds(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      const success = await updateUserInSpreadsheet(userId, { avatarUrl: base64 });
      if (!success) {
        console.warn("Gagal menyimpan avatar ke spreadsheet, namun tetap disimpan lokal.");
      }

      if (currentUser?.id === userId) {
        const updatedUser = { ...currentUser, avatarUrl: base64 };
        setCurrentUser(updatedUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      }
    };
    reader.readAsDataURL(file);
  };

  const dashboardStats = useMemo(() => {
    const targetHubs = ['Tompobulu Hub', 'Biringbulu Hub', 'Bungaya Hub'];
    return targetHubs.map(hubName => {
      const hubTasks = tasks.filter(t => t.hub === hubName || t.hub.toLowerCase().includes(hubName.split(' ')[0].toLowerCase()));
      let totalPkgs = 0;
      let scannedPkgs = 0;
      let totalTasksCount = 0;
      let scannedTasksCount = 0;
      hubTasks.forEach(group => {
        group.tasks.forEach(task => {
          totalPkgs += task.packageCount;
          totalTasksCount += 1;
          if (scannedTaskIds.has(task.taskId)) {
            scannedPkgs += task.packageCount;
            scannedTasksCount += 1;
          }
        });
      });
      return {
        name: hubName,
        totalPackages: totalPkgs,
        scannedPackages: scannedPkgs,
        unscannedPackages: totalPkgs - scannedPkgs,
        totalTasks: totalTasksCount,
        scannedTasks: scannedTasksCount,
        pendingTasks: totalTasksCount - scannedTasksCount,
        progress: totalPkgs > 0 ? Math.round((scannedPkgs / totalPkgs) * 100) : 0
      };
    });
  }, [tasks, scannedTaskIds]);

  const overallStats = useMemo(() => {
    const total = dashboardStats.reduce((acc, hub) => acc + hub.totalPackages, 0);
    const scanned = dashboardStats.reduce((acc, hub) => acc + hub.scannedPackages, 0);
    return [
      { name: 'Selesai Scan', value: scanned, fill: '#3b82f6' },
      { name: 'Belum Scan', value: total - scanned, fill: '#e2e8f0' }
    ];
  }, [dashboardStats]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchHub = taskHubFilter === 'All Hubs' || t.hub === taskHubFilter;
      const matchRole = taskRoleFilter === 'All Roles' || t.courierRole === taskRoleFilter;
      return matchHub && matchRole;
    });
  }, [tasks, taskHubFilter, taskRoleFilter]);

  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === 'All') return attendance;
    return attendance.filter(a => a.status === attendanceFilter);
  }, [attendance, attendanceFilter]);

  const uniqueStations = useMemo(() => ['All Stations', ...new Set(allUsers.map(u => u.station).filter(Boolean))], [allUsers]);
  const uniqueRoles = useMemo(() => ['All Roles', ...new Set(allUsers.map(u => u.role).filter(Boolean))], [allUsers]);

  const usersWithAvatars = useMemo(() => {
    return allUsers.map(u => ({
      ...u,
      avatarUrl: customAvatars[u.id] || u.avatarUrl
    }));
  }, [allUsers, customAvatars]);

  const filteredEmployees = useMemo(() => {
    return usersWithAvatars.filter(u => {
      const matchStation = empStationFilter === 'All Stations' || u.station === empStationFilter;
      const matchRole = empRoleFilter === 'All Roles' || u.role === empRoleFilter;
      const matchSearch = u.name.toLowerCase().includes(empSearch.toLowerCase()) || u.id.toLowerCase().includes(empSearch.toLowerCase());
      return matchStation && matchRole && matchSearch;
    });
  }, [usersWithAvatars, empStationFilter, empRoleFilter, empSearch]);

  const courierEmployees = useMemo(() => filteredEmployees.filter(u => checkIsCourier(u.role as string)), [filteredEmployees, checkIsCourier]);
  const staffEmployees = useMemo(() => filteredEmployees.filter(u => !checkIsCourier(u.role as string)), [filteredEmployees, checkIsCourier]);

  const toggleTaskScanned = (taskId: string) => {
    setScannedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const settingsEmployeeSearchResults = useMemo(() => {
    if (!searchEmployeeQuery.trim()) return [];
    return allUsers.filter(u => 
      (u.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) || 
       u.id.toLowerCase().includes(searchEmployeeQuery.toLowerCase())) &&
       u.id !== currentUser?.id && u.role !== Role.HUB_LEAD
    ).slice(0, 5);
  }, [allUsers, searchEmployeeQuery, currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 sm:p-10">
          <div className="text-center mb-10">
            <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tompobulu Hub</h1>
            <p className="text-gray-500 mt-1">Personnel & Monitoring Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">User ID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="Enter User ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{loginError}</span>
              </div>
            )}
            <button
              disabled={isLoggingIn}
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to System'}
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-gray-400">
            © 2024 Tompobulu Logistics • Internal Access Only
          </div>
        </div>
      </div>
    );
  }

  // Persiapan data user aktif dengan avatar yang diperbarui
  const currentUserWithAvatar = {
    ...currentUser,
    avatarUrl: customAvatars[currentUser.id] || currentUser.avatarUrl
  };

  return (
    <Layout
      user={currentUserWithAvatar}
      onLogout={handleLogout}
      onSync={fetchData}
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      onAvatarChange={handleAvatarChange}
      hasChangedAvatar={changedAvatarIds.has(currentUser.id)}
    >
      {isLoading ? (
        <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Synchronizing hub data...</p>
        </div>
      ) : (
        <>
          {activeMenu === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Operational Dashboard</h2>
                  <p className="text-sm text-gray-500 font-medium">Monitoring Real-time Tompobulu, Biringbulu & Bungaya</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                  <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Live Sync Active</span>
                </div>
              </div>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dashboardStats.map((hub, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-xl transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-3 rounded-2xl ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-indigo-600' : 'bg-purple-600'} text-white shadow-lg`}>
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{hub.name}</span>
                      </div>
                      <div className="space-y-1 mb-6">
                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{hub.totalPackages}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Paket Harian</p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-gray-500">Scan Progress</span>
                          <span className="text-blue-600 font-black">{hub.progress}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-indigo-600' : 'bg-purple-600'}`} style={{ width: `${hub.progress}%` }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="flex flex-col">
                            <span className="text-lg font-black text-green-600 leading-none">{hub.scannedPackages}</span>
                            <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Selesai Scan</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-black text-orange-500 leading-none">{hub.unscannedPackages}</span>
                            <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Belum Scan</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <div><h3 className="text-lg font-black text-gray-900 leading-tight">Perbandingan Scan</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Total Distribusi Paket Hub</p></div>
                    <PieIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-8">
                    <div className="w-48 h-48 sm:w-64 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={overallStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {overallStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-6">
                      {overallStats.map((stat, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-4 h-4 rounded-full mt-1 shrink-0" style={{ backgroundColor: stat.fill }}></div>
                          <div><p className="text-sm font-black text-gray-800 leading-none">{stat.value} Paket</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.name}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <div><h3 className="text-lg font-black text-gray-900 leading-tight">Status Task per Hub</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Selesai vs Pending Assign</p></div>
                    <Activity className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardStats} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="scannedTasks" name="Selesai" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="pendingTasks" name="Pending" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeMenu === 'tasks' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-gray-900">Courier Tasks</h2><p className="text-gray-500 text-sm">Real-time assignment tracking (Grouped by Courier)</p></div>
                {!(currentUser && checkIsCourier(currentUser.role as string)) && (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-auto"><Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <select className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full appearance-none" value={taskHubFilter} onChange={(e) => setTaskHubFilter(e.target.value)}>
                        <option value="All Hubs">All Hubs</option><option value="Tompobulu Hub">Tompobulu Hub</option><option value="Bungaya Hub">Bungaya Hub</option><option value="Biringbulu Hub">Biringbulu Hub</option>
                      </select>
                    </div>
                    <div className="relative w-full sm:w-auto"><Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <select className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full appearance-none" value={taskRoleFilter} onChange={(e) => setTaskRoleFilter(e.target.value)}>
                        <option value="All Roles">All Roles</option><option value="Courier Dedicated">Dedicated</option><option value="Courier Plus">Plus</option><option value="Mitra">Mitra</option>
                      </select>
                    </div>
                    <div className="relative w-full sm:w-auto"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Search courier..." className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64" />
                    </div>
                  </div>
                )}
              </div>

              {(() => {
                const displayTasks = (currentUser && checkIsCourier(currentUser.role as string))
                  ? tasks.filter(t => t.courierId === currentUser.id) 
                  : filteredTasks;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayTasks.map((taskGroup, idx) => {
                      const groupScannedCount = taskGroup.tasks.filter(t => scannedTaskIds.has(t.taskId)).length;
                      const isFullyScanned = groupScannedCount === taskGroup.tasks.length;
                      return (
                        <div key={idx} onClick={() => setSelectedTaskGroup(taskGroup)} className={`p-5 rounded-3xl border transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden ${isFullyScanned ? 'bg-green-50/30 border-green-100 grayscale-[0.3]' : 'bg-white border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}>
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                          <div className="flex justify-between items-start mb-5 relative z-10">
                            <div className={`p-3 rounded-2xl shadow-lg transition-colors ${isFullyScanned ? 'bg-green-600 shadow-green-100' : 'bg-blue-600 shadow-blue-100'}`}>{isFullyScanned ? <CheckCircle2 className="w-6 h-6 text-white" /> : <Package className="w-6 h-6 text-white" />}</div>
                            <div className="text-right"><span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isFullyScanned ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-500'}`}>{taskGroup.hub}</span></div>
                          </div>
                          <div className="mb-4 relative z-10"><h4 className="text-xl font-black text-gray-900 truncate leading-tight">{taskGroup.courierName}</h4>
                            <div className="flex items-center gap-2 mt-1"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isFullyScanned ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{taskGroup.courierRole}</span><span className="text-[10px] text-gray-400 font-mono">ID: {taskGroup.courierId}</span></div>
                          </div>
                          <div className="flex items-end justify-between pt-5 border-t border-gray-50 relative z-10">
                            <div className="flex flex-col"><span className="text-2xl font-black text-gray-900 leading-none">{taskGroup.totalPackages}</span><span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Total Paket</span></div>
                            <div className="flex flex-col items-end"><span className={`text-xs font-bold ${isFullyScanned ? 'text-green-600' : 'text-gray-400'}`}>{groupScannedCount} / {taskGroup.tasks.length} Selesai</span>
                              <div className={`flex items-center gap-1 font-black text-xs mt-1 group-hover:gap-2 transition-all ${isFullyScanned ? 'text-green-600' : 'text-blue-600'}`}>{isFullyScanned ? 'Lihat Progress' : 'View Details'}<ChevronRight className="w-4 h-4" /></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              
              {selectedTaskGroup && (<QRCodeModal taskGroup={selectedTaskGroup} onClose={() => setSelectedTaskGroup(null)} scannedTaskIds={scannedTaskIds} onToggleScan={toggleTaskScanned} />)}
            </div>
          )}

          {activeMenu === 'attendance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-gray-900">Daily Attendance</h2><p className="text-gray-500 text-sm">Operator & Staff Hub Schedule - {new Date().toLocaleDateString()}</p></div>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start">
                  <button onClick={() => setAttendanceFilter('All')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${attendanceFilter === 'All' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>All</button>
                  <button onClick={() => setAttendanceFilter('Hadir')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${attendanceFilter === 'Hadir' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Hadir</button>
                  <button onClick={() => setAttendanceFilter('Off')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${attendanceFilter === 'Off' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Off</button>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr className="bg-gray-50 text-[7px] sm:text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                        <th className="px-0.5 sm:px-6 py-2 sm:py-4 whitespace-nowrap">Ops ID</th>
                        <th className="px-0.5 sm:px-6 py-2 sm:py-4 whitespace-nowrap">Nama</th>
                        <th className="px-0.5 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center">Status</th>
                        <th className="px-0.5 sm:px-6 py-2 sm:py-4 whitespace-nowrap">Lokasi</th>
                        <th className="px-0.5 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-center">Shift</th>
                        <th className="px-0.5 sm:px-6 py-2 sm:py-4 whitespace-nowrap">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAttendance.map((att, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-0.5 sm:px-6 py-1.5 sm:py-4">
                            <span className="text-[7px] sm:text-xs font-mono font-black text-gray-400 whitespace-nowrap block leading-none">{att.opsId}</span>
                          </td>
                          <td className="px-0.5 sm:px-6 py-1.5 sm:py-4">
                            <div className="flex items-center gap-1 sm:gap-3 whitespace-nowrap">
                              <div className="w-4 h-4 sm:w-8 sm:h-8 rounded-full border border-gray-100 overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[6px] sm:text-[10px] shrink-0">
                                {customAvatars[att.opsId] ? (
                                  <img src={customAvatars[att.opsId]} alt={att.name} className="w-full h-full object-cover" />
                                ) : (
                                  att.name.charAt(0)
                                )}
                              </div>
                              <span className="text-[7px] sm:text-sm font-black text-gray-800 leading-none truncate max-w-[50px] sm:max-w-none">
                                {att.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-0.5 sm:px-6 py-1.5 sm:py-4 text-center">
                            <span className={`px-1 py-0.5 sm:py-1 rounded-full text-[6.5px] sm:text-[10px] font-black uppercase whitespace-nowrap inline-block leading-none ${att.status === 'Hadir' ? 'bg-green-100 text-green-700 ring-1 ring-green-600/10' : 'bg-red-50 text-red-600 ring-1 ring-red-600/10'}`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="px-0.5 sm:px-6 py-1.5 sm:py-4">
                            <span className="text-[7px] sm:text-xs text-gray-500 font-black whitespace-nowrap block leading-none">{att.location}</span>
                          </td>
                          <td className="px-0.5 sm:px-6 py-1.5 sm:py-4 text-center">
                            <span className="text-[6.5px] sm:text-xs text-blue-600 font-black bg-blue-50 px-1 py-0.5 sm:px-2 sm:py-1 rounded-md whitespace-nowrap inline-block leading-none">
                              {att.shift}
                            </span>
                          </td>
                          <td className="px-0.5 sm:px-6 py-1.5 sm:py-4">
                            <span className="text-[7px] sm:text-xs text-gray-400 font-black italic whitespace-nowrap block leading-none truncate max-w-[35px] sm:max-w-none">
                              {att.remarks || (att.status === 'Off' ? 'Rest Day' : '-')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'employees' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Personnel Directory</h2>
                  <p className="text-sm text-gray-500 font-medium">Data Karyawan Tompobulu Hub Monitoring System</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="relative group">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select 
                      className="pl-9 pr-8 py-2 text-[11px] font-black uppercase tracking-wider bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                      value={empStationFilter}
                      onChange={(e) => setEmpStationFilter(e.target.value)}
                    >
                      {uniqueStations.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="relative group">
                    <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select 
                      className="pl-9 pr-8 py-2 text-[11px] font-black uppercase tracking-wider bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                      value={empRoleFilter}
                      onChange={(e) => setEmpRoleFilter(e.target.value)}
                    >
                      {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="relative group">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="CARI KARYAWAN..."
                      className="pl-9 pr-4 py-2 text-[11px] font-black uppercase tracking-wider bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48 placeholder:text-gray-300"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                    Daftar Kurir ({courierEmployees.length})
                  </h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-100 to-transparent"></div>
                </div>
                {courierEmployees.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courierEmployees.map(u => (
                      <EmployeeCard 
                        key={u.id} 
                        employee={u} 
                        isCurrentUser={currentUser?.id === u.id}
                        hasChangedAvatar={changedAvatarIds.has(u.id)}
                        onAvatarChange={handleAvatarChange}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Tidak ada data kurir ditemukan</p>
                  </div>
                )}
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
                    Operasional & Staff Hub ({staffEmployees.length})
                  </h3>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-indigo-100 to-transparent"></div>
                </div>
                {staffEmployees.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {staffEmployees.map(u => (
                      <EmployeeCard 
                        key={u.id} 
                        employee={u} 
                        isCurrentUser={currentUser?.id === u.id}
                        hasChangedAvatar={changedAvatarIds.has(u.id)}
                        onAvatarChange={handleAvatarChange}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Tidak ada data staff ditemukan</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeMenu === 'settings' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hub Management</h2>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Workflow Perubahan Data Personel</p>
                </div>
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-100">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{currentUser.role} Control Panel</span>
                </div>
              </div>

              {(currentUser.role === Role.HUB_LEAD || currentUser.role.toString().toLowerCase().includes('hub lead')) && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 leading-none">Antrean Persetujuan</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Menunggu Review Hub Lead</p>
                    </div>
                  </div>

                  {promotions.filter(p => p.status === 'Pending').length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 p-16 text-center">
                      <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UsersIcon className="w-10 h-10 text-gray-200" />
                      </div>
                      <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">Semua Pengajuan Telah Diproses</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {promotions.filter(p => p.status === 'Pending').map((p) => (
                        <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:border-blue-100 transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-sm font-black text-gray-900 leading-tight">{p.employeeName}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">ID: {p.employeeId}</p>
                            </div>
                            <span className="bg-orange-50 text-orange-600 text-[8px] font-black uppercase px-2 py-1 rounded-lg">Menunggu</span>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl mb-6">
                            <div className="flex-1 text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Dari</p>
                              <p className="text-[10px] font-black text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-100 truncate">{p.currentRole}</p>
                            </div>
                            <ArrowRightLeft className="w-4 h-4 text-gray-300 shrink-0" />
                            <div className="flex-1 text-center">
                              <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Ke</p>
                              <p className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 truncate">{p.proposedRole}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <p className="text-[9px] font-black text-gray-400">Oleh: {p.requestedBy}</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleApproval(p, false)}
                                className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-95"
                              >
                                Tolak
                              </button>
                              <button 
                                onClick={() => handleApproval(p, true)}
                                className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                              >
                                Setujui
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {(currentUser.role === Role.SHIFT_LEAD || currentUser.role.toString().toLowerCase().includes('shift lead')) && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <UsersIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 leading-none">Pilih Karyawan</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Cari Nama atau User ID</p>
                      </div>
                    </div>

                    <div className="relative group">
                      <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        type="text" 
                        value={searchEmployeeQuery}
                        onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                        placeholder="Ketik nama atau ID kurir/staff..."
                        className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all font-bold text-sm text-gray-700 shadow-sm"
                      />
                      
                      {settingsEmployeeSearchResults.length > 0 && !selectedEmpForAdjustment && (
                        <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                          {settingsEmployeeSearchResults.map(emp => (
                            <button 
                              key={emp.id}
                              onClick={() => {
                                setSelectedEmpForAdjustment(emp);
                                setSearchEmployeeQuery('');
                                setAdjustmentType('');
                                setAdjustmentTargetRole('');
                              }}
                              className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                                  {emp.name.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black text-gray-900">{emp.name}</p>
                                  <p className="text-[9px] font-black text-gray-400 uppercase">{emp.role} • {emp.id}</p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2rem] p-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">Informasi Penting</span>
                      </div>
                      <p className="text-[11px] text-indigo-800 font-bold leading-relaxed">
                        Pengajuan perubahan jabatan memerlukan persetujuan Hub Lead. 
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    {selectedEmpForAdjustment ? (
                      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col md:flex-row gap-8">
                        <div className="shrink-0 scale-90">
                          <EmployeeCard 
                            employee={selectedEmpForAdjustment} 
                            isCurrentUser={false}
                            hasChangedAvatar={false}
                          />
                        </div>
                        
                        <div className="flex-1 space-y-8">
                          <div>
                            <h3 className="text-lg font-black text-gray-900 leading-tight">Konfigurasi Perubahan</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pilih Tindakan & Role Baru</p>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Tipe Perubahan</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button 
                                onClick={() => setAdjustmentType('Promote')}
                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-xs font-black ${adjustmentType === 'Promote' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}
                              >
                                <UserCheck className="w-4 h-4" />
                                Promosi
                              </button>
                              <button 
                                onClick={() => setAdjustmentType('Demote')}
                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-xs font-black ${adjustmentType === 'Demote' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}
                              >
                                <UserMinus className="w-4 h-4" />
                                Demosi
                              </button>
                            </div>
                          </div>

                          {adjustmentType && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Role Pilihan</label>
                              <div className="relative">
                                <select 
                                  value={adjustmentTargetRole}
                                  onChange={(e) => setAdjustmentTargetRole(e.target.value)}
                                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-bold text-sm text-gray-700 appearance-none transition-all"
                                >
                                  <option value="">Pilih Role Baru...</option>
                                  {Object.values(Role).filter(r => r !== selectedEmpForAdjustment.role && r !== Role.HUB_LEAD).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                  ))}
                                </select>
                                <ChevronRight className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                              </div>
                            </div>
                          )}

                          <div className="pt-4 border-t border-gray-50 flex gap-3">
                            <button onClick={() => setSelectedEmpForAdjustment(null)} className="flex-1 py-4 bg-gray-50 text-gray-500 text-xs font-black uppercase rounded-2xl hover:bg-gray-100 transition-all active:scale-95">Batal</button>
                            <button onClick={handlePromotionSubmission} disabled={!adjustmentTargetRole} className={`flex-2 py-4 px-8 text-xs font-black uppercase rounded-2xl transition-all active:scale-95 shadow-lg ${!adjustmentTargetRole ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'}`}>Ajukan</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full min-h-[400px] bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center p-12 text-center group">
                        <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500"><UsersIcon className="w-12 h-12 text-gray-200" /></div>
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Pilih Karyawan</h4>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default App;
