
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

  return (
    <div className="flex flex-col items-center">
      {/* Container Card dengan aspek rasio ID Card vertikal */}
      <div className="w-full max-w-[300px] h-[500px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-gray-100 flex flex-col items-center animate-in fade-in duration-500">
        
        {/* Latar Belakang - Pola Gelombang Atas */}
        <div className="absolute top-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -left-10 w-40 h-40 bg-[#8b321a] rounded-full opacity-90"></div>
          <div className="absolute -top-12 -right-16 w-56 h-56 bg-[#e65c2a] rounded-full opacity-80"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent"></div>
        </div>

        {/* Latar Belakang - Pola Gelombang Bawah */}
        <div className="absolute bottom-0 left-0 w-full h-32 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-16 -right-10 w-40 h-40 bg-[#8b321a] rounded-full opacity-90"></div>
          <div className="absolute -bottom-12 -left-16 w-56 h-56 bg-[#e65c2a] rounded-full opacity-80"></div>
        </div>

        {/* Header - Logo/Nama Perusahaan */}
        <div className="relative mt-12 mb-4 text-center z-10">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full border-4 border-[#e65c2a] flex items-center justify-center">
              <div className="w-2 h-2 bg-[#e65c2a] rounded-full"></div>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-sm font-black text-[#e65c2a] tracking-tighter uppercase">Tompobulu</span>
              <span className="text-sm font-black text-[#8b321a] tracking-tighter uppercase">Hub Logistik</span>
            </div>
          </div>
        </div>

        {/* Foto Profil dengan Frame Lingkaran Oranye */}
        <div className="relative z-10 mt-2">
          <div className="w-32 h-32 rounded-full border-[6px] border-[#e65c2a] p-1 bg-white shadow-lg overflow-hidden flex items-center justify-center">
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center">
                <UserIcon className="w-16 h-16 text-gray-200" />
              </div>
            )}
          </div>
          
          {/* Tombol Kamera (Hanya User Sendiri & 1x) */}
          {isCurrentUser && !hasChangedAvatar && (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 bg-[#e65c2a] text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-[#8b321a] transition-colors z-20"
              >
                <Camera className="w-4 h-4" />
              </button>
            </>
          )}

          {isCurrentUser && hasChangedAvatar && (
            <div className="absolute bottom-1 right-1 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-white z-20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Name Plate - Rounded Rectangle Pill Style */}
        <div className="relative z-10 mt-6 w-[85%]">
          <div className="bg-[#e65c2a] py-3 px-4 rounded-full border-[3px] border-[#8b321a] shadow-md text-center">
            <h3 className="text-lg font-black text-white leading-none tracking-tight uppercase truncate">
              {employee.name}
            </h3>
            <p className="text-[10px] font-bold text-orange-100 uppercase mt-1 tracking-widest">
              {employee.role}
            </p>
          </div>
        </div>

        {/* Informasi Detail ID & NIK */}
        <div className="relative z-10 mt-6 flex flex-col items-center space-y-1 text-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[#8b321a] uppercase tracking-widest">User ID / ID Kurir</span>
            <span className="text-xs font-black text-gray-700 font-mono tracking-tighter">{employee.id}</span>
          </div>
          <div className="flex flex-col pt-1">
            <span className="text-[9px] font-black text-[#e65c2a] uppercase tracking-widest">NIK Karyawan</span>
            <span className="text-xs font-black text-gray-700">{employee.nik || '123-456-7890'}</span>
          </div>
          <div className="flex flex-col pt-1">
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Station</span>
             <span className="text-[10px] font-bold text-gray-500">{employee.station || 'Tompobulu'}</span>
          </div>
        </div>

        {/* QR Code Section (Menggantikan Barcode agar fungsional) */}
        <div className="relative z-10 mt-auto mb-10 flex flex-col items-center">
          <div className="bg-white p-2 border-2 border-[#e65c2a]/20 rounded-lg shadow-sm">
            <QRCodeSVG value={employee.id} size={64} fgColor="#8b321a" />
          </div>
          <span className="text-[7px] font-mono text-gray-400 mt-2 tracking-[0.4em] uppercase">Authorized personnel only</span>
        </div>

        {/* Footer URL Placeholder */}
        <div className="absolute bottom-4 z-10">
          <span className="text-[8px] font-bold text-[#8b321a]/50 uppercase tracking-widest">www.tompobulu-hub.logistics</span>
        </div>

      </div>
    </div>
  );
};

export default EmployeeCard;
