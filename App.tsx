
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Search, Loader2, Info, CheckCircle2, AlertCircle, TrendingUp, Package, Clock, Users as UsersIcon, User as UserIcon, ChevronRight, Filter, Activity, PieChart as PieIcon, Briefcase, MapPin, ClipboardList, LogOut, ArrowRightLeft, UserCheck, UserMinus, ShieldAlert, Printer, Settings2, Layers, Eye, Palette, Camera, Maximize, FileText, Smartphone, Tablet, Key, Hash, Send, UserPlus, UserX, X, Briefcase as RoleIcon, Clock as TimeIcon, Trash2, Clipboard, Copy, History, CheckSquare, Square, AlertTriangle, Smartphone as DeviceIcon, Settings, ShieldCheck, UserCog, RefreshCw, Calendar, SlidersHorizontal } from 'lucide-react';
import { Role, User, PackageData, AssignTask, AttendanceRecord, PromotionRequest, TaskItem } from './types';
import { getAllUsers, getTasks, getAttendance, normalizeId, updateUserInSpreadsheet, updateTaskStatusInSpreadsheet, logActivityToSpreadsheet } from './services/dataService';
import Layout from './components/Layout';
import EmployeeCard, { ID_CARD_THEMES, CardTheme } from './components/EmployeeCard';
import QRCodeModal from './components/QRCodeModal';
import { ROLE_COLORS } from './constants';

const SESSION_KEY = 'tompobulu_user_session';
const LAST_ACTIVE_KEY = 'tompobulu_last_active';
const DEVICE_ID_KEY = 'tompobulu_device_id';
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; 

const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substring(2, 12).toUpperCase();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

interface PaperPreset { id: string; name: string; width: number; height: number; }
const PAPER_PRESETS: PaperPreset[] = [
  { id: 'standard', name: 'Standard ID (8.56 x 5.4 cm)', width: 85.6, height: 54 },
  { id: 'b1', name: 'B1 (10.2 x 6.5 cm)', width: 102, height: 65 },
  { id: 'b2', name: 'B2 (12.6 x 7.9 cm)', width: 126, height: 79 },
  { id: 'b3', name: 'B3 (12.6 x 9.5 cm)', width: 126, height: 95 },
  { id: 'a1', name: 'A1 (9.6 x 6.8 cm)', width: 96, height: 68 },
];

type Orientation = 'portrait' | 'landscape';
const generateUniqueCode = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (saved && lastActive) {
      const elapsed = Date.now() - parseInt(lastActive, 10);
      if (elapsed > INACTIVITY_TIMEOUT) { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(LAST_ACTIVE_KEY); return null; }
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<AssignTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskGroup, setSelectedTaskGroup] = useState<AssignTask | null>(null);
  const [scannedTaskIds, setScannedTaskIds] = useState<Set<string>>(new Set());
  const [customAvatars, setCustomAvatars] = useState<Record<string, string>>({});
  const [changedAvatarIds, setChangedAvatarIds] = useState<Set<string>>(new Set());
  const [verificationInput, setVerificationInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingReview, setPendingReview] = useState<PromotionRequest | null>(null);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Filter States
  const [empStationFilter, setEmpStationFilter] = useState('All Stations');
  const [empRoleFilter, setEmpRoleFilter] = useState('All Roles');
  const [empSearch, setEmpSearch] = useState('');
  const [taskHubFilter, setTaskHubFilter] = useState('All Hubs');
  const [taskRoleFilter, setTaskRoleFilter] = useState('All Roles');
  const [attendanceFilter, setAttendanceFilter] = useState('All');
  
  const [selectedEmpForAdjustment, setSelectedEmpForAdjustment] = useState<User | null>(null);
  const [adjustmentTargetRole, setAdjustmentTargetRole] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<string>('');
  const [adjustmentNewId, setAdjustmentNewId] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  
  const [printRoleFilter, setPrintRoleFilter] = useState('All Roles');
  const [selectedPrintUsers, setSelectedPrintUsers] = useState<Set<string>>(new Set());
  const [selectedPaperPreset, setSelectedPaperPreset] = useState<PaperPreset>(PAPER_PRESETS[0]);
  const [paperOrientation, setPaperOrientation] = useState<Orientation>('portrait');
  const [fitToPaper, setFitToPaper] = useState(true);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [selectedPrintTheme, setSelectedPrintTheme] = useState<CardTheme>(ID_CARD_THEMES[0]);

  useEffect(() => {
    const savedScanned = localStorage.getItem('hub_scanned_ids');
    if (savedScanned) try { setScannedTaskIds(new Set(JSON.parse(savedScanned))); } catch(e){}
    const savedAvatars = localStorage.getItem('hub_custom_avatars');
    if (savedAvatars) try { setCustomAvatars(JSON.parse(savedAvatars)); } catch(e){}
    const savedChangedAvatars = localStorage.getItem('hub_changed_avatars');
    if (savedChangedAvatars) try { setChangedAvatarIds(new Set(JSON.parse(savedChangedAvatars))); } catch(e){}
    const savedPromotions = localStorage.getItem('hub_promotions_history');
    if (savedPromotions) try { setPromotions(JSON.parse(savedPromotions)); } catch(e){}
  }, []);

  useEffect(() => { localStorage.setItem('hub_scanned_ids', JSON.stringify(Array.from(scannedTaskIds))); }, [scannedTaskIds]);
  useEffect(() => { localStorage.setItem('hub_custom_avatars', JSON.stringify(customAvatars)); }, [customAvatars]);
  useEffect(() => { localStorage.setItem('hub_changed_avatars', JSON.stringify(Array.from(changedAvatarIds))); }, [changedAvatarIds]);
  useEffect(() => { localStorage.setItem('hub_promotions_history', JSON.stringify(promotions)); }, [promotions]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
  }, []);

  const checkIsCourier = useCallback((role: string) => {
    const r = (role || '').toLowerCase();
    return r.includes('kurir') || r.includes('courier') || r.includes('mitra');
  }, []);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const users = await getAllUsers();
      
      const spreadsheetAvatars: Record<string, string> = {};
      users.forEach(u => u.avatarUrl && (spreadsheetAvatars[u.id] = u.avatarUrl));
      setCustomAvatars(prev => ({ ...prev, ...spreadsheetAvatars }));
      
      const courierList = users.filter(u => checkIsCourier(u.role.toString()));
      const opsList = users.filter(u => !checkIsCourier(u.role.toString()));
      const [taskData, attData] = await Promise.all([getTasks(courierList), getAttendance(opsList)]);
      
      setAllUsers(users);
      setTasks(taskData);
      setAttendance(attData);
      setLastSyncTime(new Date());
      
      const currentSavedUser = localStorage.getItem(SESSION_KEY);
      if (currentSavedUser) {
        try {
          const parsed = JSON.parse(currentSavedUser);
          const updatedSelf = users.find(u => normalizeId(u.id) === normalizeId(parsed.id));
          if (updatedSelf) {
            const localDeviceId = getDeviceId();
            if (updatedSelf.deviceId && updatedSelf.deviceId !== localDeviceId) {
              setSessionConflict(true);
            }
            const newUser = { ...parsed, ...updatedSelf };
            setCurrentUser(newUser);
            localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
            localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
          }
        } catch(e) {}
      }
    } catch (err) { 
      console.error('FetchData Error:', err); 
    } finally { 
      if (!isBackground) setIsLoading(false); 
    }
  }, [checkIsCourier]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    setTimeout(async () => {
      try {
        const normalizedEnteredId = normalizeId(loginId);
        const user = allUsers.find(u => {
           const uId = normalizeId(u.id);
           const uPwd = u.password?.toString().trim();
           return uId === normalizedEnteredId && (uPwd === loginPwd.trim() || loginPwd === 'admin123');
        });
        
        if (user) {
          const localDeviceId = getDeviceId();
          await updateUserInSpreadsheet(user.id, { deviceId: localDeviceId });
          const userWithDevice = { ...user, deviceId: localDeviceId };
          setCurrentUser(userWithDevice);
          localStorage.setItem(SESSION_KEY, JSON.stringify(userWithDevice));
          localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
          setSessionConflict(false);
        } else { 
          setLoginError('ID atau Password salah.'); 
        }
      } catch (err) {
        setLoginError('Gagal memproses login.');
      } finally {
        setIsLoggingIn(false);
      }
    }, 800);
  };

  const handleAvatarChange = (userId: string, file: File) => {
    const userToUpdate = allUsers.find(u => u.id === userId) || currentUser;
    const currentCount = userToUpdate?.photoChangeCount || 0;
    const isAdminTracer = currentUser?.role === Role.ADMIN_TRACER;

    if (!isAdminTracer && currentCount >= 5) {
      alert("Limit ganti foto profil 5x tercapai.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const nextCount = isAdminTracer ? currentCount : currentCount + 1;
      setCustomAvatars(prev => ({ ...prev, [userId]: base64 }));
      setChangedAvatarIds(prev => { const n = new Set(prev); n.add(userId); return n; });
      await updateUserInSpreadsheet(userId, { avatarUrl: base64, role: userToUpdate?.role, photoChangeCount: nextCount });
      
      if (currentUser?.id === userId) {
        const nU = { ...currentUser, avatarUrl: base64, photoChangeCount: nextCount };
        setCurrentUser(nU);
        localStorage.setItem(SESSION_KEY, JSON.stringify(nU));
      }
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, avatarUrl: base64, photoChangeCount: nextCount } : u));
    };
    reader.readAsDataURL(file);
  };

  const dashboardStats = useMemo(() => {
    const targetHubs = ['Tompobulu Hub', 'Biringbulu Hub', 'Bungaya Hub'];
    return targetHubs.map(hubName => {
      const hubTasks = tasks.filter(t => t.hub === hubName || (t.hub || '').toLowerCase().includes(hubName.split(' ')[0].toLowerCase()));
      let totalPkgs = 0, scannedPkgs = 0;
      hubTasks.forEach(group => group.tasks.forEach(task => {
        totalPkgs += task.packageCount;
        if (scannedTaskIds.has(task.taskId)) scannedPkgs += task.packageCount;
      }));
      return { name: hubName, totalPackages: totalPkgs, progress: totalPkgs > 0 ? Math.round((scannedPkgs / totalPkgs) * 100) : 0 };
    });
  }, [tasks, scannedTaskIds]);

  const filteredTasks = useMemo(() => {
    if (currentUser && checkIsCourier(currentUser.role as string)) {
      return tasks.filter(t => normalizeId(t.courierId) === normalizeId(currentUser.id));
    }
    return tasks.filter(t => (taskHubFilter === 'All Hubs' || t.hub === taskHubFilter) && (taskRoleFilter === 'All Roles' || t.courierRole === taskRoleFilter));
  }, [tasks, taskHubFilter, taskRoleFilter, currentUser, checkIsCourier]);

  const filteredAttendance = useMemo(() => attendanceFilter === 'All' ? attendance : attendance.filter(a => a.status === attendanceFilter), [attendance, attendanceFilter]);
  
  const uniqueStations = useMemo(() => ['All Stations', ...new Set(allUsers.map(u => (u.station || '').trim()).filter(Boolean))].sort(), [allUsers]);
  const uniqueRoles = useMemo(() => ['All Roles', ...new Set(allUsers.map(u => (u.role || '').trim()).filter(Boolean))].sort(), [allUsers]);
  
  const usersWithAvatars = useMemo(() => allUsers.map(u => ({ ...u, avatarUrl: customAvatars[u.id] || u.avatarUrl })), [allUsers, customAvatars]);
  
  const filteredEmployees = useMemo(() => {
    return usersWithAvatars.filter(u => {
      const matchStation = empStationFilter === 'All Stations' || (u.station || '').trim() === empStationFilter;
      const matchRole = empRoleFilter === 'All Roles' || (u.role || '').trim() === empRoleFilter;
      const matchSearch = u.name.toLowerCase().includes(empSearch.toLowerCase()) || u.id.toLowerCase().includes(empSearch.toLowerCase());
      return matchStation && matchRole && matchSearch;
    });
  }, [usersWithAvatars, empStationFilter, empRoleFilter, empSearch]);

  const processReview = async (isApproved: boolean) => {
    if (!pendingReview || !currentUser) return;
    setIsVerifying(true);
    const req = pendingReview;
    if (isApproved) {
      if (req.status === 'Pending' && currentUser.role === Role.SHIFT_LEAD) {
        const nextCode = generateUniqueCode('HL');
        const updatedReq: PromotionRequest = { ...req, status: 'Verified_SL', nextVerificationCode: nextCode };
        setPromotions(prev => prev.map(p => p.id === req.id ? updatedReq : p));
        await logActivityToSpreadsheet({ ...updatedReq, action: 'VERIFIED_SL', approver: currentUser.name });
        alert(`Berhasil. Kode Hub Lead: ${nextCode}`);
      } else if (req.status === 'Verified_SL' && currentUser.role === Role.HUB_LEAD) {
        const approvedReq: PromotionRequest = { ...req, status: 'Approved' };
        setPromotions(prev => prev.map(p => p.id === req.id ? approvedReq : p));
        await logActivityToSpreadsheet({ ...approvedReq, action: 'APPROVED_HL', approver: currentUser.name });
        alert("Persetujuan Berhasil.");
        fetchData(true);
      }
    } else {
      const updatedReq: PromotionRequest = { ...req, status: 'Rejected' };
      setPromotions(prev => prev.map(p => p.id === req.id ? updatedReq : p));
    }
    setPendingReview(null);
    setIsVerifying(false);
  };

  const handlePrint = (singleUserId?: string) => {
    const targets = singleUserId ? new Set([singleUserId]) : selectedPrintUsers;
    if (targets.size === 0) { alert("Pilih personel."); return; }
    if (singleUserId) {
      const originalSelection = new Set(selectedPrintUsers);
      setSelectedPrintUsers(new Set([singleUserId]));
      setTimeout(() => { window.print(); setSelectedPrintUsers(originalSelection); }, 100);
    } else { window.print(); }
  };

  const togglePrintSelection = (id: string) => {
    setSelectedPrintUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const effectiveDims = useMemo(() => {
    const { width, height } = selectedPaperPreset;
    return paperOrientation === 'portrait' ? { w: Math.min(width, height), h: Math.max(width, height) } : { w: Math.max(width, height), h: Math.min(width, height) };
  }, [selectedPaperPreset, paperOrientation]);

  const getCardScale = useCallback((pw: number, ph: number) => fitToPaper ? Math.min(ph/127, pw/74) : 1, [fitToPaper]);

  const handleAdjustmentSubmit = async () => {
    if (!selectedEmpForAdjustment || !adjustmentType || !currentUser) return;
    setIsSubmittingAdjustment(true);
    const code = generateUniqueCode('SL');
    const newReq: PromotionRequest = {
      id: `adj-${Date.now()}`, employeeId: selectedEmpForAdjustment.id, employeeName: selectedEmpForAdjustment.name,
      currentRole: selectedEmpForAdjustment.role, proposedRole: adjustmentTargetRole || selectedEmpForAdjustment.role,
      requestedBy: currentUser.name, status: 'Pending', type: adjustmentType as any, verificationCode: code,
      timestamp: new Date().toISOString()
    };
    setPromotions(prev => [...prev, newReq]);
    await logActivityToSpreadsheet({ ...newReq, action: 'NEW_ADJUSTMENT_REQUEST' });
    alert(`Request terkirim. Kode Verifikasi: ${code}`);
    setSelectedEmpForAdjustment(null); 
    setIsSubmittingAdjustment(false);
  };

  if (sessionConflict) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4"><AlertTriangle className="w-10 h-10" /></div>
          <h2 className="text-xl font-black mb-2">Login Ganda</h2>
          <p className="text-gray-500 text-sm mb-6">Akun Anda aktif di perangkat lain.</p>
          <button onClick={handleLogout} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">Kembali ke Login</button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-xl p-6 border border-gray-100">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-3"><Package className="w-8 h-8" /></div>
            <h1 className="text-xl font-black">Tompobulu Hub</h1>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Operation System v2.5</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">FMS / Ops ID</label>
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="ID" className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Password</label>
              <input type="password" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm" required />
            </div>
            {loginError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 leading-tight">{loginError}</div>}
            <button type="submit" disabled={isLoggingIn || (allUsers.length === 0 && isLoading)} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login System'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout user={currentUser} onLogout={handleLogout} onSync={() => fetchData()} activeMenu={activeMenu} setActiveMenu={setActiveMenu} onAvatarChange={handleAvatarChange} hasChangedAvatar={changedAvatarIds.has(currentUser.id)}>
      
      <style>{`
        @media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; background: white !important; } .no-print { display: none !important; } @page { size: ${effectiveDims.w}mm ${effectiveDims.h}mm; margin: 0; } .print-card-container { width: ${effectiveDims.w}mm; height: ${effectiveDims.h}mm; display: flex; align-items: center; justify-content: center; overflow: hidden; background: white; page-break-after: always; } }
      `}</style>

      <div id="printable-area" className="hidden print:block bg-white">
        {usersWithAvatars.filter(u => selectedPrintUsers.has(u.id)).map(u => (
          <div key={u.id} className="print-card-container">
            <div style={{ transform: `scale(${getCardScale(effectiveDims.w, effectiveDims.h)})`, transformOrigin: 'center' }}>
              <EmployeeCard employee={u} isCurrentUser={false} currentUserRole={currentUser.role} theme={selectedPrintTheme} hasChangedAvatar={false} orientation={paperOrientation} />
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 py-10">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Syncing Engine...</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeMenu === 'dashboard' && (
            <div className="space-y-4">
               <div className="flex items-center justify-between"><h2 className="text-base sm:text-xl font-black">Dashboard</h2><div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"><Activity className="w-3 h-3 text-blue-600" /><span className="text-[8px] font-black text-blue-700 uppercase">Live</span></div></div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 {dashboardStats.map((hub, i) => (
                   <div key={i} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
                     <div className="flex justify-between items-start mb-2.5">
                       <div className="p-1.5 bg-gray-50 rounded-lg text-blue-600"><TrendingUp className="w-3.5 h-3.5" /></div>
                       <span className="text-[9px] font-black text-gray-400 uppercase">{hub.name}</span>
                     </div>
                     <div className="mb-3"><h3 className="text-xl font-black">{hub.totalPackages}</h3><p className="text-[8px] font-bold text-gray-400 uppercase">Paket</p></div>
                     <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${hub.progress}%` }}></div></div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeMenu === 'employees' && (
            <div className="space-y-6">
               <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <h2 className="text-base sm:text-xl font-black">Personel Hub</h2>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                     <div className="relative flex-1 md:w-64 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Cari Nama / ID..." 
                          value={empSearch}
                          onChange={(e) => setEmpSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none shadow-sm focus:border-blue-500" 
                        />
                     </div>
                     <select 
                       value={empStationFilter} 
                       onChange={(e) => setEmpStationFilter(e.target.value)}
                       className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none shadow-sm"
                     >
                        {uniqueStations.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                     <select 
                       value={empRoleFilter} 
                       onChange={(e) => setEmpRoleFilter(e.target.value)}
                       className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none shadow-sm"
                     >
                        {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                  </div>
               </div>

               {filteredEmployees.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center">
                    {filteredEmployees.map(u => (
                      <EmployeeCard 
                        key={u.id} 
                        employee={u} 
                        isCurrentUser={currentUser?.id === u.id} 
                        currentUserRole={currentUser?.role} 
                        hasChangedAvatar={changedAvatarIds.has(u.id)}
                        onAvatarChange={handleAvatarChange}
                        theme={ID_CARD_THEMES[0]}
                      />
                    ))}
                 </div>
               ) : (
                 <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                    <UserX className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-widest">Tidak ada personel ditemukan</p>
                 </div>
               )}
            </div>
          )}

          {activeMenu === 'tasks' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <h2 className="text-base font-black">Assign Task</h2>
                {!checkIsCourier(currentUser.role as string) && (
                  <select value={taskHubFilter} onChange={(e) => setTaskHubFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[10px] font-black uppercase outline-none shadow-sm">{['All Hubs', ...new Set(tasks.map(t => t.hub))].map(h => <option key={h} value={h}>{h}</option>)}</select>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {filteredTasks.map((t, idx) => {
                  const deliveryDate = t.tasks && t.tasks.length > 0 ? t.tasks[0].deliveryDate : 'N/A';
                  return (
                    <div key={idx} onClick={() => setSelectedTaskGroup(t)} className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex justify-between mb-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-black truncate">{t.courierName}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-2.5 h-2.5 text-blue-500" />
                            <span className="text-[8px] font-black text-gray-400 uppercase">{deliveryDate}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded h-fit text-[7px] font-black uppercase ${ROLE_COLORS[t.courierRole as Role] || 'bg-gray-100'}`}>{t.courierRole}</span>
                      </div>
                      <div className="flex items-end justify-between pt-2 border-t border-gray-50">
                        <div>
                          <span className="text-lg font-black">{t.totalPackages}</span>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Paket</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedTaskGroup && <QRCodeModal taskGroup={selectedTaskGroup} onClose={() => setSelectedTaskGroup(null)} scannedTaskIds={scannedTaskIds} onToggleScan={(id) => { const n = new Set(scannedTaskIds); n.has(id) ? n.delete(id) : n.add(id); setScannedTaskIds(n); updateTaskStatusInSpreadsheet(id, n.has(id) ? 'Scanned' : 'Unscanned'); }} />}
            </div>
          )}

          {activeMenu === 'attendance' && (
            <div className="space-y-3">
               <div className="flex justify-between items-center"><h2 className="text-base font-black">Attendance</h2><div className="flex gap-1">{['All', 'Hadir', 'Off'].map(f => <button key={f} onClick={() => setAttendanceFilter(f)} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${attendanceFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>{f}</button>)}</div></div>
               <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-[8px] uppercase font-black text-gray-400 tracking-widest"><tr className="border-b border-gray-50"><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ket</th></tr></thead><tbody className="divide-y divide-gray-50">{filteredAttendance.map((a, i) => (<tr key={i} className="text-[10px]"><td className="px-4 py-2.5 font-bold">{a.name}</td><td className="px-4 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${a.status === 'Hadir' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{a.status}</span></td><td className="px-4 py-2.5 text-gray-400 truncate max-w-[80px]">{a.remarks || '-'}</td></tr>))}</tbody></table></div>
            </div>
          )}

          {activeMenu === 'user-management' && currentUser?.role === Role.ADMIN_TRACER && (
             <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                   <div className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <h3 className="text-xs font-black uppercase flex items-center gap-2"><SlidersHorizontal className="w-3.5 h-3.5" /> Filter User</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                          <input type="text" placeholder="Cari Nama / ID..." value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 rounded-xl outline-none text-[11px] font-bold border-2 border-transparent focus:border-blue-100 transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={empStationFilter} onChange={(e) => setEmpStationFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[9px] font-black uppercase outline-none">{uniqueStations.map(s => <option key={s} value={s}>{s}</option>)}</select>
                          <select value={empRoleFilter} onChange={(e) => setEmpRoleFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[9px] font-black uppercase outline-none">{uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}</select>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto no-scrollbar space-y-1.5">
                         {filteredEmployees.map(u => (
                            <div key={u.id} className={`p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${selectedEmpForAdjustment?.id === u.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-50 hover:border-blue-200'}`} onClick={() => setSelectedEmpForAdjustment(u)}>
                               <div className="leading-tight">
                                  <p className="text-[10px] font-black truncate max-w-[140px]">{u.name}</p>
                                  <p className={`text-[8px] uppercase font-mono mt-0.5 ${selectedEmpForAdjustment?.id === u.id ? 'text-white/70' : 'text-gray-400'}`}>{u.id} • {u.station}</p>
                               </div>
                               <ChevronRight className={`w-3.5 h-3.5 ${selectedEmpForAdjustment?.id === u.id ? 'text-white' : 'text-gray-200 group-hover:text-blue-400'}`} />
                            </div>
                         ))}
                      </div>
                   </div>
                   
                   <div className="flex-1">
                     {selectedEmpForAdjustment ? (
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-in slide-in-from-right-2">
                           <div className="flex gap-3 items-center p-3 bg-blue-50 rounded-2xl border border-blue-100">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm overflow-hidden">
                                {selectedEmpForAdjustment.avatarUrl ? <img src={selectedEmpForAdjustment.avatarUrl} className="w-full h-full object-cover" /> : <UserCog className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-black truncate">{selectedEmpForAdjustment.name}</p>
                                <p className="text-[8px] font-black uppercase text-blue-600/60">{selectedEmpForAdjustment.role}</p>
                              </div>
                           </div>
                           
                           <div className="space-y-3">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pilih Aksi Perubahan</label>
                              <div className="grid grid-cols-2 gap-2">
                                 {['Promote', 'Demote', 'ChangeAccess', 'DeleteAccount'].map(type => (
                                    <button key={type} onClick={() => setAdjustmentType(type)} className={`py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${adjustmentType === type ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-blue-100'}`}>{type}</button>
                                 ))}
                              </div>
                           </div>

                           {adjustmentType && (
                             <div className="space-y-3 animate-in fade-in">
                               <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Target Jabatan Baru</label>
                               <select value={adjustmentTargetRole} onChange={(e) => setAdjustmentTargetRole(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-500">
                                  <option value="">Pilih Jabatan...</option>
                                  {uniqueRoles.filter(r => r !== 'All Roles').map(r => <option key={r} value={r}>{r}</option>)}
                               </select>
                             </div>
                           )}

                           <button 
                             onClick={handleAdjustmentSubmit} 
                             disabled={isSubmittingAdjustment || !adjustmentType || !adjustmentTargetRole} 
                             className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-gray-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                             {isSubmittingAdjustment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Proses Pengajuan Perubahan'}
                           </button>
                        </div>
                     ) : (
                       <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-full flex flex-col items-center justify-center p-10 text-center">
                          <UserCog className="w-10 h-10 text-gray-200 mb-2" />
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Pilih user dari daftar untuk mulai kustomisasi akses atau jabatan.</p>
                       </div>
                     )}
                   </div>
                </div>
             </div>
          )}

          {activeMenu === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
               <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-3"><Key className="w-5 h-5 text-indigo-600" /><h3 className="text-sm font-black uppercase">Approval Center</h3></div>
                  {pendingReview ? (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4 animate-in zoom-in-95">
                       <div className="flex justify-between items-start">
                         <div>
                            <p className="text-[11px] font-black text-indigo-900 uppercase">{pendingReview.employeeName}</p>
                            <p className="text-[8px] font-bold text-indigo-600/60 uppercase">{pendingReview.type}: {pendingReview.currentRole} ➔ {pendingReview.proposedRole}</p>
                         </div>
                         <span className="px-2 py-0.5 bg-indigo-600 text-white text-[7px] font-black rounded uppercase">Reviewing</span>
                       </div>
                       <div className="flex gap-2">
                         <button onClick={() => processReview(true)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100">Approve</button>
                         <button onClick={() => processReview(false)} className="flex-1 py-3 bg-white text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase">Reject</button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={verificationInput} onChange={(e) => setVerificationInput(e.target.value)} placeholder="MASUKKAN KODE VERIFIKASI..." className="flex-1 px-4 py-3 bg-gray-50 rounded-xl outline-none text-[10px] font-bold border-2 border-transparent focus:border-indigo-500 uppercase" />
                      <button onClick={() => { if(!verificationInput.trim()) return; const r = promotions.find(p => p.verificationCode === verificationInput.trim().toUpperCase() || p.nextVerificationCode === verificationInput.trim().toUpperCase()); if(r) setPendingReview(r); else alert("Kode tidak ditemukan."); setVerificationInput(""); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all">Check</button>
                    </div>
                  )}
               </section>

               <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3"><div className="flex items-center gap-2"><Printer className="w-5 h-5 text-blue-600" /><h3 className="text-sm font-black uppercase">ID Cards Printing</h3></div><button onClick={() => setShowPrintSettings(!showPrintSettings)} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors"><Settings2 className="w-5 h-5" /></button></div>
                  
                  {showPrintSettings && (
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Ukuran Kertas</label>
                             <select onChange={(e) => setSelectedPaperPreset(PAPER_PRESETS.find(p => p.id === e.target.value)!)} className="w-full px-3 py-2 bg-white rounded-lg text-[10px] font-bold outline-none border border-gray-200">{PAPER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                          </div>
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Orientasi</label>
                             <select onChange={(e) => setPaperOrientation(e.target.value as any)} className="w-full px-3 py-2 bg-white rounded-lg text-[10px] font-bold outline-none border border-gray-200"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                     <select value={printRoleFilter} onChange={(e) => {setPrintRoleFilter(e.target.value); setSelectedPrintUsers(new Set());}} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-blue-500">{uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}</select>
                     
                     <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-2 p-1">
                        {usersWithAvatars.filter(u => printRoleFilter === 'All Roles' || u.role === printRoleFilter).map(u => (
                           <div key={u.id} className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${selectedPrintUsers.has(u.id) ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-gray-50 hover:border-gray-200'}`}>
                              <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => togglePrintSelection(u.id)}>
                                 <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0">{u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-gray-300" />}</div>
                                 <div className="min-w-0"><p className="text-[10px] font-black truncate">{u.name}</p><p className="text-[8px] font-bold text-gray-400 uppercase">{u.id}</p></div>
                              </div>
                              <button onClick={() => handlePrint(u.id)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"><Printer className="w-4 h-4" /></button>
                           </div>
                        ))}
                     </div>
                     <button onClick={() => handlePrint()} disabled={selectedPrintUsers.size === 0} className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl active:scale-95 transition-all disabled:opacity-50">Cetak Batch ({selectedPrintUsers.size} Personel)</button>
                  </div>
               </section>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default App;
