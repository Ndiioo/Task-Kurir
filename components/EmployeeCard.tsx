
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface EmployeeCardProps {
  employee: User;
  isCurrentUser: boolean;
  hasChangedAvatar: boolean;
  onAvatarChange?: (id: string, file: File) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, isCurrentUser, hasChangedAvatar, onAvatarChange }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(employee.id, file);
    }
  };

  // Helper for dynamic font size of the name plate
  const getNameFontSize = (name: string) => {
    if (name.length > 25) return 'text-[11px]';
    if (name.length > 18) return 'text-[13px]';
    return 'text-[15px]';
  };

  return (
    <div className="flex flex-col items-center">
      {/* Container Card - Standard ID Card Ratio for Aesthetics */}
      <div className="w-[280px] h-[480px] bg-white rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden relative border border-gray-100 flex flex-col items-center animate-in fade-in duration-500">
        
        {/* Background Accents (Top Curves) */}
        <div className="absolute top-0 left-0 w-full h-24 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#8b321a] rounded-full opacity-100"></div>
          <div className="absolute -top-10 -right-20 w-56 h-56 bg-[#e65c2a] rounded-full opacity-100"></div>
        </div>

        {/* Background Accents (Bottom Curves) */}
        <div className="absolute bottom-0 left-0 w-full h-20 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-[#8b321a] rounded-full opacity-100"></div>
          <div className="absolute -bottom-8 -left-16 w-48 h-48 bg-[#e65c2a] rounded-full opacity-100"></div>
        </div>

        {/* Brand Header */}
        <div className="relative mt-7 mb-2 flex flex-col items-center z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border-[3px] border-[#e65c2a] flex items-center justify-center bg-white">
              <div className="w-1.5 h-1.5 bg-[#e65c2a] rounded-full"></div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black text-black uppercase tracking-tighter">Tompobulu</span>
              <span className="text-[10px] font-black text-[#8b321a] uppercase tracking-tighter">Hub Logistik</span>
            </div>
          </div>
        </div>

        {/* Profile Picture Frame */}
        <div className="relative z-10 mt-2">
          <div className="w-24 h-24 rounded-full border-[4px] border-[#e65c2a] p-1 bg-white shadow-sm overflow-hidden flex items-center justify-center">
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-gray-200" />
              </div>
            )}
          </div>
          
          {isCurrentUser && !hasChangedAvatar && (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[#e65c2a] text-white p-1.5 rounded-full shadow-lg border-2 border-white hover:bg-[#8b321a] transition-colors z-20"
              >
                <Camera className="w-3 h-3" />
              </button>
            </>
          )}

          {isCurrentUser && hasChangedAvatar && (
            <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-white z-20">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Name Plate Section - Improved Padding and Dynamic Font */}
        <div className="relative z-10 mt-5 w-[85%]">
          <div className="bg-[#e65c2a] py-2.5 px-3 rounded-[1.25rem] border-[2px] border-[#8b321a] shadow-md text-center min-h-[56px] flex flex-col justify-center">
            <h3 className={`${getNameFontSize(employee.name)} font-black text-white leading-tight uppercase`}>
              {employee.name}
            </h3>
            <p className="text-[8px] font-bold text-orange-100 uppercase mt-0.5 tracking-widest opacity-90">
              {employee.role}
            </p>
          </div>
        </div>

        {/* Detailed Information Section - Balanced Spacing */}
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
             <span className="text-[8px] font-black text-[#e65c2a] uppercase tracking-widest mb-0.5">BASE STATION</span>
             <span className="text-[11px] font-black text-blue-700 leading-none truncate max-w-[200px]">
               {employee.station || 'Tompobulu Hub'}
             </span>
          </div>
        </div>

        {/* QR Code Section - Adjusted Size for better fit */}
        <div className="relative z-10 mt-auto mb-10 bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center">
          <QRCodeSVG value={employee.id} size={54} fgColor="#8b321a" />
          <span className="text-[5px] font-mono text-gray-400 mt-1 uppercase tracking-[0.2em]">Verified Secure</span>
        </div>

        {/* Small Footer Text */}
        <div className="absolute bottom-2 z-10 opacity-40">
          <span className="text-[6px] font-bold text-[#8b321a] uppercase tracking-widest">tompobulu-hub.management-portal</span>
        </div>

      </div>
    </div>
  );
};

export default EmployeeCard;
