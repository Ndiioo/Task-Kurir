
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, User as UserIcon, CheckCircle2, ShieldCheck, Crown, Star } from 'lucide-react';
import { User, Role } from '../types';

export interface CardTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  textColor: string;
  labelColor: string;
}

export const ID_CARD_THEMES: CardTheme[] = [
  { id: 'default', name: 'Tompobulu Classic', primary: '#e65c2a', secondary: '#8b321a', accent: '#fff7ed', textColor: '#ffffff', labelColor: '#ffedd5' },
  { id: 'premium-gold', name: 'Royal Gold Premium', primary: '#b45309', secondary: '#78350f', accent: '#fef3c7', textColor: '#fef3c7', labelColor: '#fde68a' },
  { id: 'platinum', name: 'Platinum Executive', primary: '#475569', secondary: '#1e293b', accent: '#f8fafc', textColor: '#f1f5f9', labelColor: '#cbd5e1' },
  { id: 'midnight', name: 'Midnight Corporate', primary: '#1e293b', secondary: '#0f172a', accent: '#f1f5f9', textColor: '#ffffff', labelColor: '#cbd5e1' },
  { id: 'emerald', name: 'Emerald Growth', primary: '#10b981', secondary: '#065f46', accent: '#ecfdf5', textColor: '#ffffff', labelColor: '#d1fae5' },
  { id: 'obsidian', name: 'Gold Obsidian', primary: '#171717', secondary: '#404040', accent: '#fbbf24', textColor: '#fbbf24', labelColor: '#fef3c7' },
  { id: 'rose-gold', name: 'Rose Gold Luxury', primary: '#be123c', secondary: '#881337', accent: '#fff1f2', textColor: '#ffe4e6', labelColor: '#fecdd3' },
  { id: 'carbon', name: 'Carbon Fiber Dark', primary: '#262626', secondary: '#0a0a0a', accent: '#d4d4d4', textColor: '#fafafa', labelColor: '#a3a3a3' },
  { id: 'royal', name: 'Royal Purple', primary: '#7c3aed', secondary: '#4c1d95', accent: '#f5f3ff', textColor: '#ffffff', labelColor: '#ede9fe' },
  { id: 'ocean', name: 'Deep Ocean', primary: '#0284c7', secondary: '#0c4a6e', accent: '#f0f9ff', textColor: '#ffffff', labelColor: '#e0f2fe' }
];

interface EmployeeCardProps {
  employee: User;
  isCurrentUser: boolean;
  currentUserRole?: Role | string;
  hasChangedAvatar: boolean;
  onAvatarChange?: (id: string, file: File) => void;
  theme?: CardTheme;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  isCurrentUser, 
  currentUserRole,
  hasChangedAvatar, 
  onAvatarChange,
  theme = ID_CARD_THEMES[0]
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isAdminTracer = currentUserRole === Role.ADMIN_TRACER;
  const canEdit = isCurrentUser || isAdminTracer;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) onAvatarChange(employee.id, file);
  };

  const getNameFontSize = (name: string) => {
    if (name.length > 25) return 'text-[10px]';
    if (name.length > 18) return 'text-[12px]';
    return 'text-[14px]';
  };

  const isPremium = theme.id.includes('gold') || theme.id.includes('platinum') || theme.id.includes('obsidian') || theme.id.includes('carbon');

  return (
    <div className="flex flex-col items-center group/card">
      <div className="w-[275px] h-[440px] bg-white rounded-[2rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden relative border border-gray-100 flex flex-col items-center">
        
        {/* Background Gradients - Reduced height */}
        <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-100" style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})` }}></div>
          <div className="absolute -top-10 -right-24 w-64 h-64 rounded-full opacity-100" style={{ background: `linear-gradient(225deg, ${theme.primary}, ${theme.secondary})` }}></div>
          {isPremium && <div className="absolute top-4 right-4 text-white/20"><Crown className="w-10 h-10" /></div>}
        </div>

        {/* Brand Header - Compact */}
        <div className="relative mt-8 mb-4 flex flex-col items-center z-10">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-lg rounded-full border border-white/20 shadow-sm">
            <div className="w-6 h-6 rounded-full border-[2px] flex items-center justify-center bg-white shadow-sm" style={{ borderColor: theme.primary }}>
              <Star className="w-3.5 h-3.5 fill-current" style={{ color: theme.primary }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black text-white uppercase tracking-tighter">Tompobulu</span>
              <span className="text-[9px] font-bold uppercase tracking-tighter text-white/80">Hub Logistik</span>
            </div>
          </div>
        </div>

        {/* Profile Picture Section - Compact */}
        <div className="relative z-10">
          <div className="w-28 h-28 rounded-full border-[5px] p-1 bg-white shadow-xl overflow-hidden flex items-center justify-center" style={{ borderColor: theme.primary }}>
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center">
                <UserIcon className="w-14 h-14 text-gray-200" />
              </div>
            )}
          </div>
          
          {canEdit && (
            <div className="absolute bottom-0 right-0 z-20">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full shadow-lg border-2 border-white transition-all hover:scale-110 active:scale-95 text-white"
                style={{ backgroundColor: isAdminTracer ? '#2563eb' : theme.primary }}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {hasChangedAvatar && (
            <div className="absolute top-0 left-0 bg-green-500 p-1.5 rounded-full border-2 border-white shadow-md z-20">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Name Plate - Integrated with spacing optimization */}
        <div className="relative z-10 mt-5 w-[88%]">
          <div className="py-3 px-3 rounded-[1.25rem] shadow-xl text-center border-b-4 border-black/20" 
               style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
            <h3 className={`${getNameFontSize(employee.name)} font-black text-white leading-tight uppercase tracking-wide drop-shadow-md truncate`}>
              {employee.name}
            </h3>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-white/40"></div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/90">
                {employee.role}
              </p>
              <div className="w-1 h-1 rounded-full bg-white/40"></div>
            </div>
          </div>
        </div>

        {/* Detail List - Adjusted for smaller card */}
        <div className="relative z-10 mt-4 w-full px-7 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Employee ID</span>
            <span className="text-[12px] font-black text-gray-800 font-mono tracking-tighter">
              {employee.id}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Base Station</span>
            <span className="text-[10px] font-black text-gray-700 uppercase truncate max-w-[140px] text-right">
              {employee.station || 'Tompobulu Hub'}
            </span>
          </div>
        </div>

        {/* Footer Area - Height reduced to 100px to avoid overlapping details */}
        <div className="absolute bottom-0 left-0 w-full h-[100px] bg-gray-50/90 backdrop-blur-md border-t border-gray-100 flex flex-col items-center justify-center pb-2 z-10">
          <div className="bg-white p-2 rounded-xl shadow-inner mb-1.5 border border-gray-100">
            <QRCodeSVG value={employee.id} size={48} fgColor={theme.secondary} />
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <ShieldCheck className="w-2.5 h-2.5 text-blue-500" />
            <span className="text-[7px] font-black uppercase tracking-[0.25em]">Authorized Personnel</span>
          </div>
          <p className="text-[6px] text-gray-300 mt-1 uppercase font-bold tracking-widest">© Tompobulu Management v2.5</p>
        </div>

      </div>
    </div>
  );
};

export default EmployeeCard;
