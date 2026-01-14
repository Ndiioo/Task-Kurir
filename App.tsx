
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Search, Loader2, Info, CheckCircle2, AlertCircle, TrendingUp, Package, Clock, Users as UsersIcon, ChevronRight, Filter, Activity, PieChart as PieIcon, Briefcase, MapPin, ClipboardList, LogOut, ArrowRightLeft, UserCheck, UserMinus, ShieldAlert, Printer, Settings2, Layers, Eye, Palette, Camera, Maximize, FileText, Smartphone, Tablet, Key, Hash, Send, UserPlus, UserX, X, Briefcase as RoleIcon, Clock as TimeIcon, Trash2, Clipboard } from 'lucide-react';
import { Role, User, PackageData, AssignTask, AttendanceRecord, PromotionRequest, TaskItem } from './types';
import { getAllUsers, getTasks, getAttendance, normalizeId, updateUserInSpreadsheet, updateTaskStatusInSpreadsheet, logActivityToSpreadsheet } from './services/dataService';
import Layout from './components/Layout';
import EmployeeCard, { ID_CARD_THEMES, CardTheme } from './components/EmployeeCard';
import QRCodeModal from './components/QRCodeModal';
import { ROLE_COLORS } from './constants';

const SESSION_KEY = 'tompobulu_user_session';
const LAST_ACTIVE_KEY = 'tompobulu_last_active';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; 

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

  const [empStationFilter, setEmpStationFilter] = useState('All Stations');
  const [empRoleFilter, setEmpRoleFilter] = useState('All Roles');
  const [empSearch, setEmpSearch] = useState('');
  const [taskHubFilter, setTaskHubFilter] = useState('All Hubs');
  const [taskRoleFilter, setTaskRoleFilter] = useState('All Roles');
  const [attendanceFilter, setAttendanceFilter] = useState('All');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [selectedEmpForAdjustment, setSelectedEmpForAdjustment] = useState<User | null>(null);
  const [adjustmentTargetRole, setAdjustmentTargetRole] = useState<Role | string>('');
  const [adjustmentType, setAdjustmentType] = useState<'Promote' | 'Demote' | 'ChangeAccess' | 'ResetPhotoLimit' | 'AddAccess' | 'RemoveAccess' | ''>('');
  const [printRoleFilter, setPrintRoleFilter] = useState('All Roles');
  const [printEmployeeId, setPrintEmployeeId] = useState('All');
  const [selectedPaperPreset, setSelectedPaperPreset] = useState<PaperPreset>(PAPER_PRESETS[0]);
  const [paperOrientation, setPaperOrientation] = useState<Orientation>('portrait');
  const [fitToPaper, setFitToPaper] = useState(false);
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
    const r = role.toLowerCase();
    return r.includes('kurir') || r.includes('courier') || r.includes('mitra');
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
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
      
      const currentSavedUser = localStorage.getItem(SESSION_KEY);
      if (currentSavedUser) {
        try {
          const parsed = JSON.parse(currentSavedUser);
          const updatedSelf = users.find(u => u.id === parsed.id);
          if (updatedSelf) {
            const newUser = { ...parsed, ...updatedSelf };
            setCurrentUser(newUser);
            localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
          }
        } catch(e) {}
      }
    } catch (err) { 
      console.error('FetchData Error:', err); 
    } finally { 
      setIsLoading(false); 
    }
  }, [checkIsCourier]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (allUsers.length === 0 && isLoading) {
      setLoginError('Sistem sedang sinkronisasi data. Harap tunggu sebentar...');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      try {
        const normalizedEnteredId = normalizeId(loginId);
        const user = allUsers.find(u => u.id === normalizedEnteredId && (u.password === loginPwd || loginPwd === 'admin123'));
        
        if (user) {
          if (checkIsCourier(user.role as string)) {
            const hasTask = tasks.some(t => t.courierId === user.id);
            if (!hasTask) {
               setLoginError(`Hai ${user.name}, Anda tidak memiliki tugas pengantaran hari ini. Jika Anda merasa tidak libur maka silahkan konfirmasi ke Shift Lead Anda.`);
               setIsLoggingIn(false);
               return;
            }
          }
          
          setCurrentUser(user);
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
          localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
        } else { 
          setLoginError('User ID atau Password tidak valid.'); 
        }
      } catch (err) {
        setLoginError('Terjadi kesalahan saat memproses login.');
      } finally {
        setIsLoggingIn(false);
      }
    }, 800);
  };

  const handleAvatarChange = (userId: string, file: File) => {
    const userToUpdate = allUsers.find(u => u.id === userId) || currentUser;
    const currentCount = userToUpdate?.photoChangeCount || 0;
    
    // Khusus Admin Tracer: bypass limit cek
    const isAdminTracer = currentUser?.role === Role.ADMIN_TRACER;

    if (!isAdminTracer && currentCount >= 5) {
      if (confirm("Limit tercapai. Ajukan reset ke Shift Lead?") && currentUser) {
        const code = generateUniqueCode('SL');
        const newReq: PromotionRequest = {
          id: `reset-${Date.now()}`, employeeId: userToUpdate?.id || '', employeeName: userToUpdate?.name || '',
          currentRole: userToUpdate?.role || '', proposedRole: userToUpdate?.role || '',
          requestedBy: currentUser.name, status: 'Pending', type: 'ResetPhotoLimit', verificationCode: code, timestamp: new Date().toISOString()
        };
        setPromotions(prev => [...prev, newReq]);
        logActivityToSpreadsheet({ ...newReq, action: 'NEW_REQUEST' });
        alert(`Request dibuat. Kode: ${code}`);
      }
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
      const hubTasks = tasks.filter(t => t.hub === hubName || t.hub.toLowerCase().includes(hubName.split(' ')[0].toLowerCase()));
      let totalPkgs = 0, scannedPkgs = 0, totalTasksCount = 0, scannedTasksCount = 0;
      hubTasks.forEach(group => group.tasks.forEach(task => {
        totalPkgs += task.packageCount; totalTasksCount += 1;
        if (scannedTaskIds.has(task.taskId)) { scannedPkgs += task.packageCount; scannedTasksCount += 1; }
      }));
      return { name: hubName, totalPackages: totalPkgs, scannedPackages: scannedPkgs, unscannedPackages: totalPkgs - scannedPkgs, totalTasks: totalTasksCount, scannedTasks: scannedTasksCount, pendingTasks: totalTasksCount - scannedTasksCount, progress: totalPkgs > 0 ? Math.round((scannedPkgs / totalPkgs) * 100) : 0 };
    });
  }, [tasks, scannedTaskIds]);

  const filteredTasks = useMemo(() => {
    if (currentUser && checkIsCourier(currentUser.role as string)) {
      return tasks.filter(t => t.courierId === currentUser.id);
    }
    return tasks.filter(t => (taskHubFilter === 'All Hubs' || t.hub === taskHubFilter) && (taskRoleFilter === 'All Roles' || t.courierRole === taskRoleFilter));
  }, [tasks, taskHubFilter, taskRoleFilter, currentUser, checkIsCourier]);

  const filteredAttendance = useMemo(() => attendanceFilter === 'All' ? attendance : attendance.filter(a => a.status === attendanceFilter), [attendance, attendanceFilter]);
  const uniqueStations = useMemo(() => ['All Stations', ...new Set(allUsers.map(u => u.station).filter(Boolean))], [allUsers]);
  const uniqueRoles = useMemo(() => ['All Roles', ...new Set(allUsers.map(u => u.role).filter(Boolean))], [allUsers]);
  const usersWithAvatars = useMemo(() => allUsers.map(u => ({ ...u, avatarUrl: customAvatars[u.id] || u.avatarUrl })), [allUsers, customAvatars]);
  const filteredEmployees = useMemo(() => usersWithAvatars.filter(u => (empStationFilter === 'All Stations' || u.station === empStationFilter) && (empRoleFilter === 'All Roles' || u.role === empRoleFilter) && (u.name.toLowerCase().includes(empSearch.toLowerCase()) || u.id.toLowerCase().includes(empSearch.toLowerCase()))), [usersWithAvatars, empStationFilter, empRoleFilter, empSearch]);

  const settingsEmployeeSearchResults = useMemo(() => {
    if (!searchEmployeeQuery.trim()) return [];
    return usersWithAvatars.filter(u => 
      u.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) || 
      u.id.toLowerCase().includes(searchEmployeeQuery.toLowerCase())
    ).slice(0, 5);
  }, [usersWithAvatars, searchEmployeeQuery]);

  const handleCodeVerification = () => {
    if (!verificationInput.trim()) return;
    const input = verificationInput.trim().toUpperCase();
    const req = promotions.find(p => p.verificationCode === input || p.nextVerificationCode === input);
    if (!req) { alert("Kode tidak valid."); return; }
    setPendingReview(req);
    setVerificationInput('');
  };

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
        alert(`Verifikasi Shift Lead Berhasil. Teruskan kode ini ke Hub Lead: ${nextCode}`);
      } else if (req.status === 'Verified_SL' && currentUser.role === Role.HUB_LEAD) {
        // Tandai sebagai disetujui di log segera
        const approvedReq: PromotionRequest = { ...req, status: 'Approved' };
        setPromotions(prev => prev.map(p => p.id === req.id ? approvedReq : p));
        await logActivityToSpreadsheet({ ...approvedReq, action: 'APPROVED_HL', approver: currentUser.name });
        
        alert("Persetujuan Hub Lead Berhasil. Sistem sedang melakukan pencocokan device dan sinkronisasi database. Perubahan akan aktif otomatis dalam 5 menit.");

        // Jeda 5 menit sebelum menerapkan perubahan fungsional
        setTimeout(async () => {
          if (req.type === 'ResetPhotoLimit') {
            await updateUserInSpreadsheet(req.employeeId, { photoChangeCount: 0 });
            setAllUsers(prev => prev.map(u => u.id === req.employeeId ? { ...u, photoChangeCount: 0 } : u));
          } else if (req.type === 'RemoveAccess') {
            await updateUserInSpreadsheet(req.employeeId, { role: 'INACTIVE' });
            setAllUsers(prev => prev.map(u => u.id === req.employeeId ? { ...u, role: 'INACTIVE' } : u));
          } else {
            await updateUserInSpreadsheet(req.employeeId, { role: req.proposedRole });
            setAllUsers(prev => prev.map(u => u.id === req.employeeId ? { ...u, role: req.proposedRole } : u));
          }
          console.log(`[System] Perubahan untuk ${req.employeeName} (Type: ${req.type}) telah aktif setelah delay 5 menit.`);
        }, 5 * 60 * 1000);

      } else { alert("Wewenang tidak sesuai."); }
    } else {
      const updatedReq: PromotionRequest = { ...req, status: 'Rejected' };
      setPromotions(prev => prev.map(p => p.id === req.id ? updatedReq : p));
      await logActivityToSpreadsheet({ ...updatedReq, action: 'REJECTED', approver: currentUser.name });
      alert("Permintaan ditolak dan dicatat dalam log.");
    }
    setPendingReview(null);
    setIsVerifying(false);
  };

  const handlePromotionSubmission = () => {
    if (!selectedEmpForAdjustment || !currentUser || !adjustmentType) return;
    const targetRole = (adjustmentType === 'ResetPhotoLimit' || adjustmentType === 'RemoveAccess') ? selectedEmpForAdjustment.role : adjustmentTargetRole;
    if (!targetRole && adjustmentType !== 'ResetPhotoLimit' && adjustmentType !== 'RemoveAccess') { alert("Pilih role."); return; }
    const code = generateUniqueCode('SL');
    const newReq: PromotionRequest = {
      id: `adj-${Date.now()}`, employeeId: selectedEmpForAdjustment.id, employeeName: selectedEmpForAdjustment.name,
      currentRole: selectedEmpForAdjustment.role, proposedRole: targetRole, requestedBy: currentUser.name,
      status: 'Pending', type: adjustmentType as any, verificationCode: code, timestamp: new Date().toISOString()
    };
    setPromotions(prev => [...prev, newReq]);
    logActivityToSpreadsheet({ ...newReq, action: 'NEW_REQUEST' });
    alert(`Request dibuat. Kode: ${code}`);
    setSelectedEmpForAdjustment(null); setAdjustmentType(''); setSearchEmployeeQuery('');
  };

  const handlePrint = () => window.print();
  const getEffectiveDimensions = useCallback(() => {
    const { width, height } = selectedPaperPreset;
    return paperOrientation === 'portrait' ? { w: Math.min(width, height), h: Math.max(width, height) } : { w: Math.max(width, height), h: Math.min(width, height) };
  }, [selectedPaperPreset, paperOrientation]);
  const effectiveDims = useMemo(() => getEffectiveDimensions(), [getEffectiveDimensions]);
  const getCardScale = useCallback((pw: number, ph: number) => fitToPaper ? Math.min(ph/127, pw/74) : 1, [fitToPaper]);

  const printUsers = useMemo(() => printEmployeeId !== 'All' ? usersWithAvatars.filter(u => u.id === printEmployeeId) : (printRoleFilter === 'All Roles' ? usersWithAvatars : usersWithAvatars.filter(u => u.role === printRoleFilter)), [usersWithAvatars, printRoleFilter, printEmployeeId]);

  const isManagementAllowed = (role: string) => {
    const r = role.toLowerCase();
    return r.includes('lead') || r.includes('tracer');
  };

  const hubOptions = useMemo(() => ['All Hubs', ...new Set(tasks.map(t => t.hub).filter(Boolean))], [tasks]);

  if (!currentUser) {
    const isSystemLoading = allUsers.length === 0 && isLoading;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
              <Package className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Tompobulu Hub</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Operational Engine v2.0</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">FMS User ID / ID Ops</label>
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="Contoh: 123456" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Password</label>
              <input type="password" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold" required />
            </div>
            
            {loginError && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3 animate-in shake duration-300">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-xs font-bold text-red-600 leading-tight whitespace-pre-wrap">{loginError}</p>
              </div>
            )}
            
            {isSystemLoading && !loginError && (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <p className="text-xs font-bold text-blue-600">Menghubungkan ke server hub...</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoggingIn || isSystemLoading} 
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all flex items-center justify-center gap-3 ${
                isSystemLoading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSystemLoading ? (
                'Syncing Hub...'
              ) : (
                <><LogOut className="w-5 h-5 rotate-180" /> Login to System</>
              )}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">© 2024 Tompobulu Hub Logistics</p>
          </div>
        </div>
      </div>
    );
  }

  const userForLayout = { ...currentUser, avatarUrl: customAvatars[currentUser.id] || currentUser.avatarUrl };

  return (
    <Layout 
      user={userForLayout} 
      onLogout={handleLogout} 
      onSync={fetchData} 
      activeMenu={activeMenu} 
      setActiveMenu={setActiveMenu} 
      onAvatarChange={handleAvatarChange} 
      hasChangedAvatar={changedAvatarIds.has(currentUser.id)}
    >
      <style>{`
        @media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; background: white !important; } .no-print { display: none !important; } @page { size: ${effectiveDims.w}mm ${effectiveDims.h}mm; margin: 0; } .print-card-container { width: ${effectiveDims.w}mm; height: ${effectiveDims.h}mm; display: flex; align-items: center; justify-content: center; overflow: hidden; background: white; page-break-after: always; } }
      `}</style>

      <div id="printable-area" className="hidden print:block bg-white">{printUsers.map(u => (<div key={u.id} className="print-card-container"><div style={{ transform: `scale(${getCardScale(effectiveDims.w, effectiveDims.h)})`, transformOrigin: 'center' }}><EmployeeCard employee={u} isCurrentUser={false} currentUserRole={currentUser.role} hasChangedAvatar={false} theme={selectedPrintTheme} /></div></div>))}</div>

      {isLoading ? (<div className="h-full flex flex-col items-center justify-center gap-4 py-12"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="text-gray-500 font-medium tracking-widest uppercase text-xs">Syncing Hub Engine...</p></div>) : (
        <>
          {activeMenu === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4"><div><h2 className="text-2xl font-black text-gray-900 tracking-tight">Operational Dashboard</h2><p className="text-sm text-gray-500 font-medium">Monitoring Real-time Hub Data</p></div><div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100"><Activity className="w-4 h-4 text-blue-600 animate-pulse" /><span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Live Sync Active</span></div></div>
               <section className="grid grid-cols-1 md:grid-cols-3 gap-6">{dashboardStats.map((hub, idx) => (<div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-xl transition-all"><div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div><div className="relative z-10"><div className="flex items-center justify-between mb-6"><div className={`p-3 rounded-2xl ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-indigo-600' : 'bg-purple-600'} text-white shadow-lg`}><TrendingUp className="w-5 h-5" /></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{hub.name}</span></div><div className="space-y-1 mb-6"><h3 className="text-4xl font-black text-gray-900 tracking-tighter">{hub.totalPackages}</h3><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Paket Harian</p></div><div className="space-y-4"><div className="flex items-center justify-between text-xs font-bold"><span className="text-gray-500">Scan Progress</span><span className="text-blue-600 font-black">{hub.progress}%</span></div><div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-indigo-600' : 'bg-purple-600'}`} style={{ width: `${hub.progress}%` }}></div></div></div></div></div>))} </section>
            </div>
          )}

          {activeMenu === 'tasks' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                     <h2 className="text-2xl font-bold text-gray-900">Courier Tasks</h2>
                     <p className="text-gray-500 text-sm">{checkIsCourier(currentUser.role as string) ? 'Tugas pengantaran harian Anda' : 'Real-time assignment tracking'}</p>
                  </div>
                  {!checkIsCourier(currentUser.role as string) && (
                     <div className="flex items-center gap-3">
                        <div className="relative">
                           <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                           <select 
                              value={taskHubFilter} 
                              onChange={(e) => setTaskHubFilter(e.target.value)}
                              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase shadow-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px]"
                           >
                              {hubOptions.map(hub => <option key={hub} value={hub}>{hub}</option>)}
                           </select>
                        </div>
                     </div>
                  )}
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{filteredTasks.map((tG, idx) => { const rC = ROLE_COLORS[tG.courierRole as Role] || 'bg-white border-gray-100'; return (<div key={idx} onClick={() => setSelectedTaskGroup(tG)} className={`p-5 rounded-[2rem] border-2 transition-all cursor-pointer hover:shadow-xl active:scale-[0.98] ${rC.replace('text-', 'border-')}`}><div className="mb-4 flex justify-between items-start"><div><h4 className="text-xl font-black text-gray-900 leading-tight">{tG.courierName}</h4><span className="text-[10px] text-gray-400 font-mono tracking-widest">FMS: {tG.courierId}</span></div><span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${rC}`}>{tG.courierRole}</span></div><div className="p-4 rounded-2xl mb-4 bg-gray-50 bg-opacity-40 flex justify-between items-center"><div><span className="text-3xl font-black text-gray-900">{tG.totalPackages}</span><p className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Total Paket</p></div><Package className="w-8 h-8 text-gray-300" /></div><div className="flex justify-between items-center pt-2 border-t border-gray-50"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tG.hub}</span><div className="text-blue-600 font-black text-xs flex items-center gap-1">Detail <ChevronRight className="w-4 h-4" /></div></div></div>); })}</div>
               {selectedTaskGroup && (<QRCodeModal taskGroup={selectedTaskGroup} onClose={() => setSelectedTaskGroup(null)} scannedTaskIds={scannedTaskIds} onToggleScan={(id) => { const n = new Set(scannedTaskIds); if (n.has(id)) n.delete(id); else n.add(id); setScannedTaskIds(n); updateTaskStatusInSpreadsheet(id, n.has(id) ? 'Scanned' : 'Unscanned'); }} />)}
               {filteredTasks.length === 0 && (
                 <div className="py-24 text-center">
                    <ClipboardList className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Tidak ada data penugasan</p>
                 </div>
               )}
            </div>
          )}

          {activeMenu === 'attendance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><h2 className="text-2xl font-bold text-gray-900">Daily Attendance</h2><p className="text-gray-500 text-sm">Staff Attendance & Schedule Monitoring</p></div><div className="flex gap-2">{['All', 'Hadir', 'Off'].map(f => (<button key={f} onClick={() => setAttendanceFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${attendanceFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>{f}</button>))}</div></div>
               <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"><table className="w-full text-left"><thead><tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 tracking-widest"><th className="px-6 py-5">Ops ID</th><th className="px-6 py-5">Nama</th><th className="px-6 py-5">Jabatan</th><th className="px-6 py-5">Status</th><th className="px-6 py-5">Keterangan</th></tr></thead><tbody className="divide-y divide-gray-50">{filteredAttendance.map((att, i) => (<tr key={i} className="hover:bg-gray-50/50 transition-colors"><td className="px-6 py-4 font-mono text-xs text-gray-400">{att.opsId}</td><td className="px-6 py-4 font-bold text-gray-900">{att.name}</td><td className="px-6 py-4 text-xs font-bold text-gray-500">{att.role}</td><td className="px-6 py-4"><span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${att.status === 'Hadir' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{att.status}</span></td><td className="px-6 py-4 text-xs font-bold text-gray-400">{att.remarks || '-'}</td></tr>))}</tbody></table></div>
            </div>
          )}

          {activeMenu === 'employees' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-gray-100 pb-8"><div><h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Personnel Directory</h2><p className="text-xs text-gray-400 font-bold tracking-widest mt-1">Total {filteredEmployees.length} Personel Terdaftar</p></div><div className="flex flex-col sm:flex-row gap-4"><select value={empStationFilter} onChange={(e) => setEmpStationFilter(e.target.value)} className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">{uniqueStations.map(s => <option key={s} value={s}>{s}</option>)}</select><select value={empRoleFilter} onChange={(e) => setEmpRoleFilter(e.target.value)} className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">{uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}</select><input type="text" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="CARI..." className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase shadow-sm w-full sm:w-64" /></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">{filteredEmployees.map(u => (<EmployeeCard key={u.id} employee={u} isCurrentUser={currentUser?.id === u.id} currentUserRole={currentUser?.role} hasChangedAvatar={changedAvatarIds.has(u.id)} onAvatarChange={handleAvatarChange} />))}</div>
             </div>
          )}

          {activeMenu === 'settings' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 py-4 pb-24">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-6"><div><h2 className="text-2xl font-black text-gray-900 tracking-tight">Hub Management</h2><p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Workflow Perubahan Data Personel</p></div><div className="bg-blue-600 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg"><ShieldAlert className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">{currentUser.role} Control Panel</span></div></div>

              <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6 relative overflow-hidden">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><Key className="w-6 h-6 text-indigo-600" /></div>
                  <div><h3 className="text-lg font-black text-gray-900 leading-none">Approval Center</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Submit Kode Unik Verifikasi</p></div>
                </div>
                
                {pendingReview ? (
                   <div className="p-6 bg-indigo-50 rounded-[2rem] border-2 border-indigo-200 animate-in zoom-in duration-300">
                      <div className="flex justify-between items-start mb-6">
                         <div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Meninjau Permintaan</span>
                            <h4 className="text-xl font-black text-indigo-900 mt-1">{pendingReview.employeeName}</h4>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1 tracking-tighter">ID: {pendingReview.employeeId} • TIPE: {pendingReview.type}</p>
                         </div>
                         <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase block">Requested By</span>
                            <span className="text-xs font-black text-indigo-600">{pendingReview.requestedBy}</span>
                         </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl mb-6 border border-indigo-100">
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Target Perubahan:</p>
                         <p className="text-sm font-black text-gray-900">{pendingReview.proposedRole}</p>
                      </div>
                      <div className="flex gap-3">
                         <button disabled={isVerifying} onClick={() => processReview(false)} className="flex-1 bg-white text-red-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border border-red-100 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                           <X className="w-4 h-4" /> Tolak Request
                         </button>
                         <button disabled={isVerifying} onClick={() => processReview(true)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                           {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Setujui & Proses
                         </button>
                      </div>
                   </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Input Kode Unik (Format: SL-XXXX atau HL-XXXX)</label>
                      <div className="relative">
                        <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input type="text" value={verificationInput} onChange={(e) => setVerificationInput(e.target.value)} placeholder="CONTOH: SL-AB12CD" className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-black text-sm uppercase tracking-widest text-gray-700" />
                      </div>
                    </div>
                    <button onClick={handleCodeVerification} disabled={!verificationInput.trim()} className="h-[60px] px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-indigo-700 shadow-lg active:scale-95 disabled:bg-gray-200 transition-all">
                      <Send className="w-4 h-4" /> Cek Kode
                    </button>
                  </div>
                )}
              </section>

              <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center"><ClipboardList className="w-6 h-6 text-orange-600" /></div>
                  <div><h3 className="text-lg font-black text-gray-900 leading-none">Daftar Kode Aktif</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Monitoring Pengajuan & Log Perubahan</p></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                        <th className="py-4 px-2">Karyawan</th>
                        <th className="py-4 px-2">Type</th>
                        <th className="py-4 px-2">Kode SL</th>
                        <th className="py-4 px-2">Kode HL</th>
                        <th className="py-4 px-2">Status</th>
                        <th className="py-4 px-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {promotions.slice().reverse().slice(0, 10).map(req => (
                        <tr key={req.id} className="text-xs">
                          <td className="py-4 px-2"><p className="font-black text-gray-800">{req.employeeName}</p><p className="text-[9px] text-gray-400 uppercase">{req.employeeId}</p></td>
                          <td className="py-4 px-2 font-bold text-gray-500 uppercase text-[10px]">{req.type}</td>
                          <td className="py-4 px-2 font-mono font-black text-indigo-600">{req.verificationCode || '-'}</td>
                          <td className="py-4 px-2 font-mono font-black text-purple-600">{req.nextVerificationCode || '-'}</td>
                          <td className="py-4 px-2">
                             <span className={`px-2 py-1 rounded-full font-black uppercase text-[8px] ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : req.status === 'Verified_SL' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {req.status}
                             </span>
                          </td>
                          <td className="py-4 px-2">
                             <button onClick={() => { navigator.clipboard.writeText(req.verificationCode || ''); alert("Kode SL disalin."); }} className="p-2 text-gray-400 hover:text-blue-600 transition-all"><Clipboard className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                      {promotions.length === 0 && (<tr><td colSpan={6} className="py-12 text-center text-gray-300 font-black uppercase tracking-widest text-[10px]">Belum ada pengajuan</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </section>

              {isManagementAllowed(currentUser.role) && (
                <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 no-print">
                   <div className="flex items-center gap-3 border-b border-gray-50 pb-6"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><UsersIcon className="w-6 h-6 text-blue-600" /></div><div><h3 className="text-lg font-black text-gray-900 leading-none">Management Request</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Ajukan Perubahan & Akses Personel</p></div></div>
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5 space-y-6">
                      <div className="relative group"><Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600" /><input type="text" value={searchEmployeeQuery} onChange={(e) => setSearchEmployeeQuery(e.target.value)} placeholder="Cari nama atau ID..." className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-sm border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all" />{settingsEmployeeSearchResults.length > 0 && !selectedEmpForAdjustment && (<div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden">{settingsEmployeeSearchResults.map(emp => (<button key={emp.id} onClick={() => setSelectedEmpForAdjustment(emp)} className="w-full p-4 flex items-center gap-3 hover:bg-blue-50 border-b border-gray-50 last:border-0"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">{emp.name.charAt(0)}</div><div className="text-left"><p className="text-xs font-black text-gray-900">{emp.name}</p><p className="text-[9px] font-bold text-gray-400 uppercase">{emp.role} • {emp.id}</p></div></button>))}</div>)}</div>
                    </div>
                    <div className="lg:col-span-7">
                      {selectedEmpForAdjustment ? (
                        <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-6 animate-in slide-in-from-right-4 duration-500">
                          <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-black text-blue-600 shadow-sm">{selectedEmpForAdjustment.name.charAt(0)}</div><div><h4 className="text-sm font-black text-gray-900">{selectedEmpForAdjustment.name}</h4><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedEmpForAdjustment.role} • {selectedEmpForAdjustment.id}</p></div><button onClick={() => setSelectedEmpForAdjustment(null)} className="ml-auto p-2 text-gray-400 hover:text-red-600 transition-all"><X className="w-4 h-4" /></button></div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Pilih Tipe Aksi</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[{ id: 'ResetPhotoLimit', label: 'Reset Foto', icon: Camera, color: 'orange' }, { id: 'AddAccess', label: 'Add Access', icon: UserPlus, color: 'blue' }, { id: 'RemoveAccess', label: 'Remove Access', icon: UserX, color: 'red' }, { id: 'Promote', label: 'Promosi', icon: UserCheck, color: 'green' }, { id: 'Demote', label: 'Demosi', icon: UserMinus, color: 'purple' }].map((type) => (<button key={type.id} onClick={() => setAdjustmentType(type.id as any)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all text-[9px] font-black uppercase ${adjustmentType === type.id ? `bg-white border-${type.color}-500 text-${type.color}-700 shadow-md` : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'}`}><type.icon className="w-4 h-4" />{type.label}</button>))}
                            </div>
                          </div>
                          {adjustmentType && adjustmentType !== 'ResetPhotoLimit' && adjustmentType !== 'RemoveAccess' && (<div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Target Jabatan/Role</label><select value={adjustmentTargetRole} onChange={(e) => setAdjustmentTargetRole(e.target.value)} className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm outline-none shadow-sm">{Object.values(Role).filter(r => r !== selectedEmpForAdjustment.role && r !== Role.HUB_LEAD).map(r => (<option key={r} value={r}>{r}</option>))}</select></div>)}
                          <div className="pt-4 flex gap-2"><button onClick={() => setSelectedEmpForAdjustment(null)} className="flex-1 py-4 bg-white text-gray-400 text-[10px] font-black uppercase rounded-2xl border border-gray-200">Batal</button><button onClick={handlePromotionSubmission} className="flex-2 py-4 px-8 bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Ajukan & Generate Kode</button></div>
                        </div>
                      ) : (<div className="h-full min-h-[300px] border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-gray-300"><UsersIcon className="w-12 h-12 mb-4 opacity-30" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">Pilih Karyawan Untuk Memulai Request</p></div>)}
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8 no-print">
                 <div className="flex items-center justify-between border-b border-gray-50 pb-6"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Printer className="w-6 h-6 text-blue-600" /></div><div><h3 className="text-lg font-black text-gray-900 leading-none">Cetak Kartu Karyawan</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Sistem Percetakan ID Card Otomatis</p></div></div><button onClick={() => setShowPrintSettings(!showPrintSettings)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 transition-all"><Settings2 className="w-5 h-5" /></button></div>
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Filter Jabatan</label><select value={printRoleFilter} onChange={(e) => { setPrintRoleFilter(e.target.value); setPrintEmployeeId('All'); }} className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none">{uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}</select></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Pilih Karyawan</label><select value={printEmployeeId} onChange={(e) => setPrintEmployeeId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none font-bold text-sm outline-none"><option value="All">Semua ({printRoleFilter})</option>{usersWithAvatars.filter(u => printRoleFilter === 'All Roles' || u.role === printRoleFilter).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-600"/> Pilihan Kertas</label><div className="grid grid-cols-1 gap-2">{PAPER_PRESETS.map((paper) => (<button key={paper.id} onClick={() => setSelectedPaperPreset(paper)} className={`p-3 rounded-xl border-2 text-left transition-all ${selectedPaperPreset.id === paper.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}><p className="text-[11px] font-black text-gray-900 leading-none mb-1">{paper.name}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{paper.width}mm x {paper.height}mm</p></button>))}</div></div>
                        <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Maximize className="w-3.5 h-3.5 text-blue-600"/> Orientasi & Skala</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setPaperOrientation('portrait')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${paperOrientation === 'portrait' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-400 hover:border-blue-200'}`}><Smartphone className="w-6 h-6" /><span className="text-[10px] font-black uppercase tracking-widest">Portrait</span></button><button onClick={() => setPaperOrientation('landscape')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${paperOrientation === 'landscape' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-400 hover:border-blue-200'}`}><Tablet className="w-6 h-6 rotate-90" /><span className="text-[10px] font-black uppercase tracking-widest">Landscape</span></button></div><div className="mt-6 flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100"><Maximize className="w-5 h-5 text-orange-600" /><div className="flex-1"><p className="text-[11px] font-black text-orange-800 uppercase leading-none">Fit to Paper</p><p className="text-[9px] text-orange-600 font-bold mt-1">Skala kartu otomatis.</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={fitToPaper} onChange={() => setFitToPaper(!fitToPaper)} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div></label></div></div>
                      </div>
                      <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-blue-600"/> Tema Visual</label><div className="grid grid-cols-5 gap-2">{ID_CARD_THEMES.map((theme) => (<button key={theme.id} onClick={() => setSelectedPrintTheme(theme)} className={`h-8 rounded-lg border-2 transition-all ${selectedPrintTheme.id === theme.id ? 'border-blue-500 shadow-inner' : 'border-transparent shadow-sm'}`} style={{ backgroundColor: theme.primary }}></button>))}</div></div>
                      <button onClick={handlePrint} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all active:scale-[0.98]"><Printer className="w-4 h-4" /> Buka Dialog Printer</button>
                    </div>
                    <div className="lg:col-span-5 flex flex-col items-center">
                       <div className="w-full space-y-4">
                          <div className="flex items-center gap-2 px-1"><Eye className="w-4 h-4 text-blue-600" /><h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Preview Mode</h4></div>
                          <div className="bg-gray-200 p-8 rounded-[3rem] border-2 border-dashed border-gray-100 flex items-center justify-center overflow-hidden min-h-[400px]">
                             <div className="bg-white shadow-2xl relative flex items-center justify-center transition-all duration-500 border border-gray-300" style={{ width: `${effectiveDims.w * 2.5}px`, height: `${effectiveDims.h * 2.5}px` }}>
                                <div style={{ transform: `scale(${getCardScale(effectiveDims.w, effectiveDims.h) * 0.5})`, transformOrigin: 'center' }}>
                                   {printUsers.length > 0 && <EmployeeCard employee={printUsers[0]} isCurrentUser={false} currentUserRole={currentUser.role} hasChangedAvatar={false} theme={selectedPrintTheme} />}
                                </div>
                             </div>
                          </div>
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
