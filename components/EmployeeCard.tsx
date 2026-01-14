
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, User as UserIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { User } from '../types';

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
  { id: 'midnight', name: 'Midnight Corporate', primary: '#1e293b', secondary: '#0f172a', accent: '#f1f5f9', textColor: '#ffffff', labelColor: '#cbd5e1' },
  { id: 'emerald', name: 'Emerald Growth', primary: '#10b981', secondary: '#065f46', accent: '#ecfdf5', textColor: '#ffffff', labelColor: '#d1fae5' },
  { id: 'obsidian', name: 'Gold Obsidian', primary: '#171717', secondary: '#404040', accent: '#fbbf24', textColor: '#fbbf24', labelColor: '#fef3c7' },
  { id: 'royal', name: 'Royal Purple', primary: '#7c3aed', secondary: '#4c1d95', accent: '#f5f3ff', textColor: '#ffffff', labelColor: '#ede9fe' },
  { id: 'ruby', name: 'Ruby Active', primary: '#e11d48', secondary: '#881337', accent: '#fff1f2', textColor: '#ffffff', labelColor: '#ffe4e6' },
  { id: 'ocean', name: 'Deep Ocean', primary: '#0284c7', secondary: '#0c4a6e', accent: '#f0f9ff', textColor: '#ffffff', labelColor: '#e0f2fe' },
  { id: 'minimalist', name: 'Slate Minimal', primary: '#64748b', secondary: '#334155', accent: '#f8fafc', textColor: '#ffffff', labelColor: '#f1f5f9' },
  { id: 'forest', name: 'Forest Deep', primary: '#166534', secondary: '#064e3b', accent: '#f0fdf4', textColor: '#ffffff', labelColor: '#dcfce7' },
  { id: 'arctic', name: 'Arctic Clean', primary: '#0ea5e9', secondary: '#0369a1', accent: '#f0f9ff', textColor: '#ffffff', labelColor: '#e0f2fe' }
];

interface EmployeeCardProps {
  employee: User;
  isCurrentUser: boolean;
  hasChangedAvatar: boolean;
  onAvatarChange?: (id: string, file: File) => void;
  theme?: CardTheme;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  isCurrentUser, 
  hasChangedAvatar, 
  onAvatarChange,
  theme = ID_CARD_THEMES[0]
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const photoCount = employee.photoChangeCount || 0;
  const isAtLimit = photoCount >= 5;

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

  return (
    <div className="flex flex-col items-center">
      <div className="w-[280px] h-[480px] bg-white rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden relative border border-gray-100 flex flex-col items-center animate-in fade-in duration-500">
        
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-24 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full opacity-100" style={{ backgroundColor: theme.secondary }}></div>
          <div className="absolute -top-10 -right-20 w-56 h-56 rounded-full opacity-100" style={{ backgroundColor: theme.primary }}></div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-20 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full opacity-100" style={{ backgroundColor: theme.secondary }}></div>
          <div className="absolute -bottom-8 -left-16 w-48 h-48 rounded-full opacity-100" style={{ backgroundColor: theme.primary }}></div>
        </div>

        {/* Brand Header */}
        <div className="relative mt-7 mb-2 flex flex-col items-center z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border-[3px] flex items-center justify-center bg-white" style={{ borderColor: theme.primary }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black text-black uppercase tracking-tighter">Tompobulu</span>
              <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: theme.secondary }}>Hub Logistik</span>
            </div>
          </div>
        </div>

        {/* Profile Picture Frame */}
        <div className="relative z-10 mt-2">
          <div className="w-24 h-24 rounded-full border-[4px] p-1 bg-white shadow-sm overflow-hidden flex items-center justify-center" style={{ borderColor: theme.primary }}>
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-gray-200" />
              </div>
            )}
          </div>
          
          {isCurrentUser && (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              {!isAtLimit ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 text-white p-1.5 rounded-full shadow-lg border-2 border-white transition-colors z-20"
                  style={{ backgroundColor: theme.primary }}
                  title={`Ganti Foto (${photoCount}/5)`}
                >
                  <Camera className="w-3 h-3" />
                </button>
              ) : (
                <div 
                  className="absolute bottom-0 right-0 bg-red-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white z-20"
                  title="Limit Ganti Foto Tercapai (5/5)"
                >
                  <AlertTriangle className="w-3 h-3" />
                </div>
              )}
            </>
          )}

          {isCurrentUser && hasChangedAvatar && !isAtLimit && (
            <div className="absolute bottom-0 left-0 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-white z-20">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Name Plate Section */}
        <div className="relative z-10 mt-5 w-[85%]">
          <div className="py-2.5 px-3 rounded-[1.25rem] border-[2px] shadow-md text-center min-h-[56px] flex flex-col justify-center" 
               style={{ backgroundColor: theme.primary, borderColor: theme.secondary }}>
            <h3 className={`${getNameFontSize(employee.name)} font-black leading-tight uppercase`} style={{ color: theme.textColor }}>
              {employee.name}
            </h3>
            <p className="text-[8px] font-bold uppercase mt-0.5 tracking-widest opacity-90" style={{ color: theme.labelColor }}>
              {employee.role}
            </p>
          </div>
        </div>

        {/* Detailed Information Section */}
        <div className="relative z-10 mt-5 flex flex-col items-center w-full px-4 gap-3 text-center">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">USER ID / FMS ID</span>
            <span className="text-sm font-black text-gray-800 font-mono leading-none tracking-tight">{employee.id}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">NIK KARYAWAN</span>
            <span className="text-[11px] font-black text-gray-700 leading-none">
              {employee.nik || '730603xxxxxxxxxx'}
            </span>
          </div>

          <div className="flex flex-col">
             <span className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: theme.primary }}>BASE STATION</span>
             <span className="text-[11px] font-black text-blue-700 leading-none truncate max-w-[200px]">
               {employee.station || 'Tompobulu Hub'}
             </span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="relative z-10 mt-auto mb-10 bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center">
          <QRCodeSVG value={employee.id} size={54} fgColor={theme.secondary} />
          <span className="text-[5px] font-mono text-gray-400 mt-1 uppercase tracking-[0.2em]">Verified Secure</span>
        </div>

        {/* Small Footer Text */}
        <div className="absolute bottom-2 z-10 opacity-40">
          <span className="text-[6px] font-bold uppercase tracking-widest" style={{ color: theme.secondary }}>tompobulu-hub.management-portal</span>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;
