
import React, { useState, useRef } from 'react';
import { Menu, X, LayoutDashboard, ClipboardList, CalendarCheck, Users, Settings, LogOut, RefreshCw, Camera, User as UserIcon, AlertTriangle } from 'lucide-react';
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
    const r = role.toLowerCase();
    return r.includes('operator') || 
           r.includes('daily worker') || 
           r.includes('shift worker') || 
           r.includes('admin') || 
           r.includes('lead');
  };

  const handleProfileClick = () => {
    if (isAtLimit) {
      alert("Limit ganti foto profil telah mencapai batas (5x). Silakan hubungi Shift Lead untuk request reset limit.");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(user.id, file);
    }
  };

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      isVisible: isOperatorType(user.role as string) 
    },
    { 
      id: 'tasks', 
      label: 'Assign Task', 
      icon: ClipboardList, 
      isVisible: true 
    },
    { 
      id: 'attendance', 
      label: 'Attendance', 
      icon: CalendarCheck, 
      isVisible: true 
    },
    { 
      id: 'employees', 
      label: 'Daftar Karyawan', 
      icon: Users, 
      isVisible: isOperatorType(user.role as string) || user.role.toString().toLowerCase().includes('kurir')
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      isVisible: user.role.toString().toLowerCase().includes('lead')
    },
  ];

  const filteredMenuItems = menuItems.filter(item => item.isVisible);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <RunningFeed />

      <header className="bg-white border-b border-gray-200 h-16 sticky top-8 z-40 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Tompobulu Hub</h1>
            <p className="text-xs text-blue-600 font-medium">{user.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onSync}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all group"
            title="Sync Data"
          >
            <RefreshCw className="w-5 h-5 group-active:rotate-180 transition-transform duration-500" />
          </button>
          <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>
          
          <div className="hidden sm:flex items-center gap-3 mr-2">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-700">{user.name}</span>
              <span className="text-[10px] text-gray-400 font-mono">{user.id}</span>
            </div>
            <div className="w-9 h-9 rounded-full border-2 border-blue-100 p-0.5 shadow-sm overflow-hidden bg-white">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        <aside className={`
          fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50 md:translate-x-0 md:static
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between md:hidden mb-6">
              <span className="font-bold text-gray-800">Menu Navigation</span>
              <button onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <nav className="space-y-1 flex-1 no-scrollbar overflow-y-auto">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <div className="bg-gray-50 rounded-2xl p-4 group relative">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-2 flex justify-between">
                  <span>Signed in as</span>
                  {!isAtLimit ? (
                    <button onClick={handleProfileClick} className="text-blue-600 hover:underline flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5" /> Ganti ({photoCount}/5)
                    </button>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Limit tercapai
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {!isAtLimit && (
                      <button 
                        onClick={handleProfileClick}
                        className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-full shadow-lg border-2 border-white hover:bg-blue-700 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Camera className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-700 truncate">{user.name}</span>
                    <span className="text-[10px] text-gray-400 truncate">{user.role}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
