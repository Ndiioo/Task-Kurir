
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, User as UserIcon, CheckCircle2, AlertTriangle, ShieldCheck, Crown, Star } from 'lucide-react';
import { User, Role } from '../types';

export interface CardTheme {
  id: string;
  name: string;
  primary: string;    // e.g. #e65c2a
  secondary: string;  // e.g. #8b321a
  accent: string;     // e.g. #fff7ed
  textColor: string;  // e.g. #ffffff
  labelColor: string; // e.g. #orange-100
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
  const photoCount = employee.photoChangeCount || 0;
  const isAtLimit = photoCount >= 5;
  
  // Wewenang edit: Pemilik akun atau Admin Tracer
  const isAdminTracer = currentUserRole === Role.ADMIN_TRACER;
  const canEdit = isCurrentUser || isAdminTracer;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(employee.id, file);
    }
  };

  const getNameFontSize = (name: string) => {
    if (name.length > 25) return 'text-[11px]';
    if (name.length > 18) return 'text-[13px]';
    return 'text-[15px]';
  };

  const isPremium = theme.id.includes('gold') || theme.id.includes('platinum') || theme.id.includes('obsidian') || theme.id.includes('carbon');

  return (
    <div className="flex flex-col items-center group/card">
      <div className="w-[280px] h-[480px] bg-white rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden relative border border-gray-100 flex flex-col items-center animate-in fade-in duration-500 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-shadow">
        
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full opacity-100" style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})` }}></div>
          <div className="absolute -top-10 -right-24 w-64 h-64 rounded-full opacity-100" style={{ background: `linear-gradient(225deg, ${theme.primary}, ${theme.secondary})` }}></div>
          {isPremium && (
             <div className="absolute top-4 right-4 text-white/20">
                <Crown className="w-12 h-12" />
             </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 w-full h-24 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full opacity-100" style={{ background: `linear-gradient(315deg, ${theme.secondary}, ${theme.primary})` }}></div>
          <div className="absolute -bottom-10 -left-20 w-56 h-56 rounded-full opacity-100" style={{ background: `linear-gradient(45deg, ${theme.primary}, ${theme.secondary})` }}></div>
        </div>

        {/* Brand Header */}
        <div className="relative mt-8 mb-2 flex flex-col items-center z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-[3px] flex items-center justify-center bg-white shadow-sm" style={{ borderColor: theme.primary }}>
              {isPremium ? <Star className="w-4 h-4 fill-current" style={{ color: theme.primary }} /> : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }}></div>}
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-black text-black uppercase tracking-tighter">Tompobulu</span>
              <span className="text-[11px] font-black uppercase tracking-tighter" style={{ color: theme.secondary }}>Hub Logistik</span>
            </div>
          </div>
        </div>

        {/* Profile Picture Frame */}
        <div className="relative z-10 mt-3">
          <div className="w-28 h-28 rounded-full border-[5px] p-1 bg-white shadow-md overflow-hidden flex items-center justify-center" style={{ borderColor: theme.primary }}>
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center">
                <UserIcon className="w-14 h-14 text-gray-200" />
              </div>
            )}
          </div>
          
          {canEdit && (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              {(!isAtLimit || isAdminTracer) ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 text-white p-2 rounded-full shadow-lg border-2 border-white transition-all z-20 hover:scale-110 active:scale-95"
                  style={{ backgroundColor: isAdminTracer ? '#2563eb' : theme.primary }}
                  title={isAdminTracer ? "Admin Edit Foto" : `Ganti Foto (${photoCount}/5)`}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div 
                  className="absolute bottom-1 right-1 bg-red-500 text-white p-2 rounded-full shadow-lg border-2 border-white z-20"
                  title="Limit Ganti Foto Tercapai (5/5)"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              )}
            </>
          )}

          {canEdit && hasChangedAvatar && !isAtLimit && (
            <div className="absolute bottom-1 left-1 bg-green-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white z-20">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Name Plate Section */}
        <div className="relative z-10 mt-6 w-[85%]">
          <div className="py-3 px-4 rounded-[1.5rem] border-[2px] shadow-lg text-center min-h-[64px] flex flex-col justify-center transition-transform group-hover/card:scale-105" 
               style={{ background: `linear-gradient(to bottom right, ${theme.primary}, ${theme.secondary})`, borderColor: theme.accent }}>
            <h3 className={`${getNameFontSize(employee.name)} font-black leading-tight uppercase tracking-tight`} style={{ color: theme.textColor }}>
              {employee.name}
            </h3>
            <p className="text-[9px] font-black uppercase mt-1 tracking-[0.15em] opacity-90" style={{ color: theme.labelColor }}>
              {employee.role}
            </p>
          </div>
        </div>

        {/* Detailed Information Section */}
        <div className="relative z-10 mt-6 flex flex-col items-center w-full px-4 gap-4 text-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">FMS USER ID</span>
            <span className="text-base font-black text-gray-800 font-mono leading-none tracking-tight">{employee.id}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">NOMOR NIK</span>
            <span className="text-[12px] font-black text-gray-700 leading-none">
              {employee.nik || '730603xxxxxxxxxx'}
            </span>
          </div>

          <div className="flex flex-col group/station">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: theme.primary }}>BASE STATION HUB</span>
             <span className="text-[12px] font-black text-blue-700 leading-none truncate max-w-[220px]">
               {employee.station || 'Tompobulu Hub'}
             </span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="relative z-10 mt-auto mb-12 bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center transition-all group-hover/card:shadow-md">
          <QRCodeSVG value={employee.id} size={64} fgColor={theme.secondary} />
          <div className="flex items-center gap-1 mt-1.5 opacity-50">
             <ShieldCheck className="w-2 h-2" style={{ color: theme.primary }} />
             <span className="text-[6px] font-mono text-gray-500 uppercase tracking-[0.2em]">Verified Secure</span>
          </div>
        </div>

        <div className="absolute bottom-3 z-10 opacity-30">
          <span className="text-[7px] font-bold uppercase tracking-[0.3em]" style={{ color: theme.secondary }}>tompobulu.management-v2</span>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;
