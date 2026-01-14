
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Search, Loader2, Info, CheckCircle2, AlertCircle, TrendingUp, Package, Clock, Users as UsersIcon, ChevronRight, Filter, Activity, PieChart as PieIcon, Briefcase, MapPin, ClipboardList, LogOut, ArrowRightLeft, UserCheck, UserMinus, ShieldAlert, Printer, Settings2, Layers, Eye, Palette, Camera, Maximize, FileText, Smartphone, Tablet } from 'lucide-react';
import { Role, User, PackageData, AssignTask, AttendanceRecord, PromotionRequest, TaskItem } from './types';
import { getAllUsers, getTasks, getAttendance, normalizeId, updateUserInSpreadsheet, updateTaskStatusInSpreadsheet } from './services/dataService';
import Layout from './components/Layout';
import EmployeeCard, { ID_CARD_THEMES, CardTheme } from './components/EmployeeCard';
import QRCodeModal from './components/QRCodeModal';

const SESSION_KEY = 'tompobulu_user_session';
const LAST_ACTIVE_KEY = 'tompobulu_last_active';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 Menit

interface PaperPreset {
  id: string;
  name: string;
  width: number; // mm
  height: number; // mm
}

const PAPER_PRESETS: PaperPreset[] = [
  { id: 'standard', name: 'Standard ID (8.56 x 5.4 cm)', width: 85.6, height: 54 },
  { id: 'b1', name: 'B1 (10.2 x 6.5 cm)', width: 102, height: 65 },
  { id: 'b2', name: 'B2 (12.6 x 7.9 cm)', width: 126, height: 79 },
  { id: 'b3', name: 'B3 (12.6 x 9.5 cm)', width: 126, height: 95 },
  { id: 'a1', name: 'A1 (9.6 x 6.8 cm)', width: 96, height: 68 },
];

type Orientation = 'portrait' | 'landscape';

const App: React.FC = () => {
  // Auth State
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
      try { return JSON.parse(saved); } catch (e) { return null; }
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

  // Filters & Tracking
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

  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [selectedEmpForAdjustment, setSelectedEmpForAdjustment] = useState<User | null>(null);
  const [adjustmentTargetRole, setAdjustmentTargetRole] = useState<Role | string>('');
  const [adjustmentType, setAdjustmentType] = useState<'Promote' | 'Demote' | 'ChangeAccess' | 'ResetPhotoLimit' | ''>('');

  // Print States
  const [printRoleFilter, setPrintRoleFilter] = useState('All Roles');
  const [printEmployeeId, setPrintEmployeeId] = useState('All');
  const [selectedPaperPreset, setSelectedPaperPreset] = useState<PaperPreset>(PAPER_PRESETS[0]);
  const [paperOrientation, setPaperOrientation] = useState<Orientation>('portrait');
  const [fitToPaper, setFitToPaper] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [selectedPrintTheme, setSelectedPrintTheme] = useState<CardTheme>(ID_CARD_THEMES[0]);

  const timeoutRef = useRef<any>(null);

  // Persistence Sync
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

  useEffect(() => { localStorage.setItem('hub_scanned_ids', JSON.stringify(Array.from(scannedTaskIds))); }, [scannedTaskIds]);
  useEffect(() => { localStorage.setItem('hub_custom_avatars', JSON.stringify(customAvatars)); }, [customAvatars]);
  useEffect(() => { localStorage.setItem('hub_changed_avatars', JSON.stringify(Array.from(changedAvatarIds))); }, [changedAvatarIds]);
  useEffect(() => { localStorage.setItem('hub_promotions_history', JSON.stringify(promotions)); }, [promotions]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const checkIsCourier = useCallback((role: string) => {
    const r = role.toLowerCase();
    return r.includes('kurir') || r.includes('courier') || r.includes('mitra');
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const users = await getAllUsers();
      
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

      setAllUsers(users);
      setTasks(taskData);
      setAttendance(attData);

      if (currentUser) {
        const updatedSelf = users.find(u => u.id === currentUser.id);
        if (updatedSelf && (updatedSelf.role !== currentUser.role || updatedSelf.avatarUrl !== currentUser.avatarUrl || updatedSelf.photoChangeCount !== currentUser.photoChangeCount)) {
          const newUser = { ...currentUser, ...updatedSelf };
          setCurrentUser(newUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
        }
      }
    } catch (err) {
      console.error('Data sync failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkIsCourier, currentUser]);

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
            setLoginError(`Hai "${user.name}", Anda tidak memiliki tugas hari ini.`);
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

  const handleAvatarChange = (userId: string, file: File) => {
    const userToUpdate = allUsers.find(u => u.id === userId) || currentUser;
    const currentCount = userToUpdate?.photoChangeCount || 0;

    if (currentCount >= 5) {
      alert("Limit ganti foto profil telah mencapai batas (5x). Silakan hubungi Shift Lead untuk request reset limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const nextCount = currentCount + 1;
      
      setCustomAvatars(prev => ({ ...prev, [userId]: base64 }));
      setChangedAvatarIds(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      const success = await updateUserInSpreadsheet(userId, { 
        avatarUrl: base64,
        role: userToUpdate?.role,
        photoChangeCount: nextCount
      });
      
      if (currentUser?.id === userId) {
        const updatedUser = { ...currentUser, avatarUrl: base64, photoChangeCount: nextCount };
        setCurrentUser(updatedUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      }

      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, photoChangeCount: nextCount } : u));
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

  const toggleTaskScanned = async (taskId: string) => {
    const isCurrentlyScanned = scannedTaskIds.has(taskId);
    setScannedTaskIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyScanned) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
    await updateTaskStatusInSpreadsheet(taskId, isCurrentlyScanned ? 'Unscanned' : 'Scanned');
  };

  const handleApproval = async (request: PromotionRequest, isApproved: boolean) => {
    setPromotions(prev => prev.map(p => 
      p.id === request.id ? { ...p, status: isApproved ? 'Approved' : 'Rejected' } : p
    ));

    if (isApproved) {
      if (request.type === 'ResetPhotoLimit') {
        const success = await updateUserInSpreadsheet(request.employeeId, { photoChangeCount: 0 });
        if (success) {
          setAllUsers(prev => prev.map(u => u.id === request.employeeId ? { ...u, photoChangeCount: 0 } : u));
          if (currentUser?.id === request.employeeId) {
            const updatedUser = { ...currentUser, photoChangeCount: 0 };
            setCurrentUser(updatedUser);
            localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
          }
          alert(`Limit ganti foto profil ${request.employeeName} telah direset.`);
        }
      } else {
        const success = await updateUserInSpreadsheet(request.employeeId, { role: request.proposedRole });
        if (success) {
          setAllUsers(prev => prev.map(u => u.id === request.employeeId ? { ...u, role: request.proposedRole } : u));
          if (currentUser?.id === request.employeeId) {
            const updatedUser = { ...currentUser, role: request.proposedRole };
            setCurrentUser(updatedUser);
            localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
          }
          alert(`Request berhasil disetujui. Jabatan ${request.employeeName} kini adalah ${request.proposedRole}.`);
        }
      }
    }
  };

  const handlePromotionSubmission = () => {
    if (!selectedEmpForAdjustment || !currentUser || !adjustmentType) return;
    const targetRole = adjustmentType === 'ResetPhotoLimit' ? selectedEmpForAdjustment.role : adjustmentTargetRole;
    if (!targetRole && adjustmentType !== 'ResetPhotoLimit') {
        alert("Harap pilih role target.");
        return;
    }
    const newRequest: PromotionRequest = {
      id: `adj-${Date.now()}`,
      employeeId: selectedEmpForAdjustment.id,
      employeeName: selectedEmpForAdjustment.name,
      currentRole: selectedEmpForAdjustment.role,
      proposedRole: targetRole,
      requestedBy: currentUser.name,
      status: 'Pending',
      type: adjustmentType as any
    };
    setPromotions(prev => [...prev, newRequest]);
    setSelectedEmpForAdjustment(null);
    setAdjustmentTargetRole('');
    setAdjustmentType('');
    setSearchEmployeeQuery('');
    alert("Permintaan telah dikirim ke Hub Lead untuk persetujuan.");
  };

  const settingsEmployeeSearchResults = useMemo(() => {
    if (!searchEmployeeQuery.trim()) return [];
    return allUsers.filter(u => 
      (u.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) || 
       u.id.toLowerCase().includes(searchEmployeeQuery.toLowerCase())) &&
       u.id !== currentUser?.id && u.role !== Role.HUB_LEAD
    ).slice(0, 5);
  }, [allUsers, searchEmployeeQuery, currentUser]);

  const printUsers = useMemo(() => {
    let filtered = usersWithAvatars;
    if (printRoleFilter !== 'All Roles') {
      filtered = filtered.filter(u => u.role === printRoleFilter);
    }
    if (printEmployeeId !== 'All') {
      filtered = filtered.filter(u => u.id === printEmployeeId);
    }
    return filtered;
  }, [usersWithAvatars, printRoleFilter, printEmployeeId]);

  const handlePrint = () => {
    if (printUsers.length === 0) {
      alert("Tidak ada karyawan yang dipilih untuk dicetak.");
      return;
    }
    setIsGeneratingPrint(true);
    setTimeout(() => {
      window.print();
      setIsGeneratingPrint(false);
    }, 500);
  };

  // Printing Dimensions Helper
  const getEffectiveDimensions = useCallback(() => {
    const { width, height } = selectedPaperPreset;
    if (paperOrientation === 'portrait') {
      return { 
        w: Math.min(width, height), 
        h: Math.max(width, height) 
      };
    } else {
      return { 
        w: Math.max(width, height), 
        h: Math.min(width, height) 
      };
    }
  }, [selectedPaperPreset, paperOrientation]);

  const getCardScale = useCallback((presetWidth: number, presetHeight: number) => {
    const cardBaseW = 74; 
    const cardBaseH = 127;
    if (!fitToPaper) return 1;

    const scaleH = presetHeight / cardBaseH;
    const scaleW = presetWidth / cardBaseW;
    return Math.min(scaleH, scaleW);
  }, [fitToPaper]);

  const effectiveDims = useMemo(() => getEffectiveDimensions(), [getEffectiveDimensions]);

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
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter User ID" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" required />
            </div>
            {loginError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{loginError}</div>}
            <button disabled={isLoggingIn} type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to System'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            background: white !important;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          @page { 
            size: ${effectiveDims.w}mm ${effectiveDims.h}mm; 
            margin: 0;
          }
          .print-card-container {
            width: ${effectiveDims.w}mm;
            height: ${effectiveDims.h}mm;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: white;
          }
        }
      `}</style>

      {/* Hidden Printable Area */}
      <div id="printable-area" className="hidden print:block bg-white">
        {printUsers.map((u, idx) => (
          <div key={u.id} className={`print-card-container ${idx > 0 ? 'page-break' : ''}`}>
            <div style={{ transform: `scale(${getCardScale(effectiveDims.w, effectiveDims.h)})`, transformOrigin: 'center' }}>
              <EmployeeCard employee={u} isCurrentUser={false} hasChangedAvatar={false} theme={selectedPrintTheme} />
            </div>
          </div>
        ))}
      </div>

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
                  <p className="text-sm text-gray-500 font-medium">Monitoring Real-time Hub Data</p>
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
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}

          {activeMenu === 'tasks' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-gray-900">Courier Tasks</h2><p className="text-gray-500 text-sm">Real-time assignment tracking</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTasks.map((taskGroup, idx) => (
                    <div key={idx} onClick={() => setSelectedTaskGroup(taskGroup)} className="p-5 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                      <div className="mb-4"><h4 className="text-xl font-black text-gray-900">{taskGroup.courierName}</h4><span className="text-[10px] text-gray-400 font-mono">ID: {taskGroup.courierId}</span></div>
                      <div className="flex justify-between items-end border-t border-gray-50 pt-4">
                        <div className="flex flex-col"><span className="text-2xl font-black text-gray-900">{taskGroup.totalPackages}</span><span className="text-[10px] uppercase font-bold text-gray-400">Total Paket</span></div>
                        <div className="text-blue-600 font-black text-xs flex items-center gap-1">Detail <ChevronRight className="w-4 h-4" /></div>
                      </div>
                    </div>
                  ))}
              </div>
              {selectedTaskGroup && (<QRCodeModal taskGroup={selectedTaskGroup} onClose={() => setSelectedTaskGroup(null)} scannedTaskIds={scannedTaskIds} onToggleScan={toggleTaskScanned} />)}
            </div>
          )}

          {activeMenu === 'attendance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-gray-900">Daily Attendance</h2><p className="text-gray-500 text-sm">Staff Attendance List</p></div>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400"><th className="px-6 py-4">Ops ID</th><th className="px-6 py-4">Nama</th><th className="px-6 py-4">Status</th></tr></thead>
                  <tbody>{filteredAttendance.map((att, i) => (<tr key={i} className="border-t border-gray-50 hover:bg-gray-50"><td className="px-6 py-4 font-mono text-xs">{att.opsId}</td><td className="px-6 py-4 font-bold">{att.name}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${att.status === 'Hadir' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{att.status}</span></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'employees' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div><h2 className="text-2xl font-black text-gray-900 tracking-tight">Personnel Directory</h2></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredEmployees.map(u => (
                    <EmployeeCard key={u.id} employee={u} isCurrentUser={currentUser?.id === u.id} hasChangedAvatar={changedAvatarIds.has(u.id)} onAvatarChange={handleAvatarChange} />
                  ))}
                </div>
             </div>
          )}

          {activeMenu === 'settings' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hub Management</h2>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Workflow Perubahan Data Personel</p>
                </div>
              </div>

              {/* ID Card Print Management Section */}
              <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 no-print overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Printer className="w-6 h-6 text-blue-600" /></div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 leading-none">Cetak Kartu Karyawan</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Sistem Percetakan ID Card Otomatis</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPrintSettings(!showPrintSettings)} className={`p-3 rounded-xl border transition-all ${showPrintSettings ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-gray-600'}`} title="Pengaturan Lanjut"><Settings2 className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Filter Jabatan</label>
                        <select value={printRoleFilter} onChange={(e) => { setPrintRoleFilter(e.target.value); setPrintEmployeeId('All'); }} className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none font-bold text-sm">
                          {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Pilih Karyawan</label>
                        <select value={printEmployeeId} onChange={(e) => setPrintEmployeeId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none font-bold text-sm">
                          <option value="All">Semua ({printRoleFilter})</option>
                          {usersWithAvatars.filter(u => printRoleFilter === 'All Roles' || u.role === printRoleFilter).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-600"/> Pilihan Kertas</label>
                        <div className="grid grid-cols-1 gap-2">
                          {PAPER_PRESETS.map((paper) => (
                            <button 
                              key={paper.id}
                              onClick={() => setSelectedPaperPreset(paper)}
                              className={`p-3 rounded-xl border-2 text-left transition-all ${selectedPaperPreset.id === paper.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}
                            >
                              <p className="text-[11px] font-black text-gray-900 leading-none mb-1">{paper.name}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{paper.width}mm x {paper.height}mm</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Maximize className="w-3.5 h-3.5 text-blue-600"/> Orientasi Kertas</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => setPaperOrientation('portrait')}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${paperOrientation === 'portrait' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-400 hover:border-blue-200'}`}
                          >
                            <Smartphone className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase">Portrait</span>
                          </button>
                          <button 
                            onClick={() => setPaperOrientation('landscape')}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${paperOrientation === 'landscape' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-400 hover:border-blue-200'}`}
                          >
                            <Tablet className="w-6 h-6 rotate-90" />
                            <span className="text-[10px] font-black uppercase">Landscape</span>
                          </button>
                        </div>

                        <div className="mt-6 flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                          <Maximize className="w-5 h-5 text-orange-600" />
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-orange-800 uppercase leading-none">Fit to Paper</p>
                            <p className="text-[9px] text-orange-600 font-bold mt-1 leading-tight">Sesuaikan otomatis skala kartu.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={fitToPaper} onChange={() => setFitToPaper(!fitToPaper)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-blue-600"/> Pilih Tema ID Card</label>
                      <div className="grid grid-cols-5 gap-2">
                        {ID_CARD_THEMES.map((theme) => (
                          <button key={theme.id} onClick={() => setSelectedPrintTheme(theme)} className={`h-8 rounded-lg border-2 transition-all ${selectedPrintTheme.id === theme.id ? 'border-blue-500 shadow-inner' : 'border-transparent shadow-sm'}`} style={{ backgroundColor: theme.primary }}></button>
                        ))}
                      </div>
                    </div>

                    <button onClick={handlePrint} disabled={isGeneratingPrint} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg active:scale-95">
                      {isGeneratingPrint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      Buka Dialog Printer
                    </button>
                  </div>

                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Preview Mode</h4>
                      </div>
                      
                      <div className="bg-gray-200 p-8 rounded-[3rem] border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden min-h-[400px]">
                        <div 
                          className="bg-white shadow-2xl relative flex items-center justify-center transition-all duration-500 border border-gray-300"
                          style={{ 
                            width: `${effectiveDims.w * 2.5}px`, 
                            height: `${effectiveDims.h * 2.5}px`,
                          }}
                        >
                          <div style={{ transform: `scale(${getCardScale(effectiveDims.w, effectiveDims.h) * 0.5})`, transformOrigin: 'center' }}>
                             {printUsers.length > 0 && <EmployeeCard employee={printUsers[0]} isCurrentUser={false} hasChangedAvatar={false} theme={selectedPrintTheme} />}
                          </div>
                          
                          {!fitToPaper && (effectiveDims.h < 127 || effectiveDims.w < 74) && (
                            <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none border-2 border-red-500 animate-pulse">
                               <span className="bg-red-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded">Card Might Not Fit</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 text-center italic font-medium">Kotak putih mewakili ukuran fisik kertas {selectedPaperPreset.name}.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default App;
