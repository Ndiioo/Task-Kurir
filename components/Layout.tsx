
import React, { useState, useRef } from 'react';
import { Menu, X, LayoutDashboard, ClipboardList, CalendarCheck, Users, Settings, LogOut, RefreshCw, Camera, User as UserIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import RunningFeed from './RunningFeed';
import { Role, User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  onSync: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onAvatarChange?: (userId: string, file: File) => void;
  hasChangedAvatar?: boolean;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, onSync, activeMenu, setActiveMenu, onAvatarChange, hasChangedAvatar, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoCount = user.photoChangeCount || 0;
  const isAtLimit = photoCount >= 5;

  const isOperatorType = (role: string) => {
    const r = (role || '').toLowerCase();
    return r.includes('operator') || r.includes('daily worker') || r.includes('shift worker') || r.includes('admin') || r.includes('lead');
  };

  const handleProfileClick = () => {
    if (isAtLimit) { alert("Limit ganti foto profil 5x."); return; }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) onAvatarChange(user.id, file);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isVisible: isOperatorType(user.role as string) },
    { id: 'tasks', label: 'Assign Task', icon: ClipboardList, isVisible: true },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck, isVisible: true },
    { id: 'employees', label: 'Personel', icon: Users, isVisible: true },
    { id: 'user-management', label: 'Users', icon: ShieldCheck, isVisible: user.role === Role.ADMIN_TRACER },
    { id: 'settings', label: 'Settings', icon: Settings, isVisible: user.role.toString().toLowerCase().includes('lead') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <RunningFeed />
      <header className="bg-white border-b border-gray-200 h-14 sm:h-16 sticky top-8 z-40 flex items-center justify-between px-3 sm:px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 md:hidden"><Menu className="w-5 h-5" /></button>
          <div className="flex flex-col"><h1 className="text-sm font-black leading-tight">Hub Monitor</h1><p className="text-[8px] text-blue-600 font-bold uppercase">{user.role}</p></div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onSync} className="p-1.5 text-gray-500 hover:text-blue-600 group"><RefreshCw className="w-4 h-4 group-active:rotate-180 transition-all" /></button>
          <div className="h-6 w-[1px] bg-gray-200 mx-1 hidden xs:block"></div>
          <div className="hidden sm:flex items-center gap-2.5 mr-1">
            <div className="text-right"><p className="text-xs font-bold leading-none">{user.name}</p><p className="text-[9px] text-gray-400 font-mono">{user.id}</p></div>
            <div className="w-8 h-8 rounded-full border border-blue-100 p-0.5 overflow-hidden">{user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">{user.name[0]}</div>}</div>
          </div>
          <button onClick={onLogout} className="p-1.5 text-gray-400 hover:text-red-600"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
        <aside className={`fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-100 transform transition-transform duration-300 z-50 md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between md:hidden mb-4"><span className="font-black text-sm uppercase">Menu</span><button onClick={() => setIsSidebarOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
            <nav className="space-y-0.5 flex-1 overflow-y-auto no-scrollbar">
              {menuItems.filter(i => i.isVisible).map((item) => (
                <button key={item.id} onClick={() => { setActiveMenu(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <item.icon className={`w-4 h-4 ${activeMenu === item.id ? 'text-white' : 'text-gray-400'}`} /> {item.label}
                </button>
              ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-gray-50">
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <div className="relative group cursor-pointer" onClick={handleProfileClick}>
                  <div className="w-9 h-9 rounded-lg bg-white border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">{user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <div className="text-blue-600 font-bold text-xs">{user.name[0]}</div>}</div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="min-w-0"><p className="text-[10px] font-black truncate">{user.name}</p><p className="text-[8px] text-gray-400 truncate">{user.id}</p></div>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 no-scrollbar">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
