
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, User as UserIcon, ShieldCheck, MapPin, Hash, CheckCircle2 } from 'lucide-react';
import { User, Role } from '../types';
import { ROLE_COLORS } from '../constants';

interface EmployeeCardProps {
  employee: User;
  isCurrentUser: boolean;
  hasChangedAvatar: boolean;
  onAvatarChange?: (id: string, file: File) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, isCurrentUser, hasChangedAvatar, onAvatarChange }) => {
  const colorClass = (ROLE_COLORS[employee.role as Role] || 'bg-gray-100 text-gray-800 border-gray-200');
  const borderHex = colorClass.split(' ').find(c => c.startsWith('border-'))?.replace('border-', 'border-') || 'border-gray-200';
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(employee.id, file);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`w-full max-w-[280px] bg-white rounded-[2rem] border-2 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${borderHex} relative`}>
        {/* Header Strip based on Role */}
        <div className={`h-3 w-full ${colorClass.split(' ')[0]}`}></div>
        
        <div className="p-6 flex flex-col items-center">
          {/* Avatar Section */}
          <div className="relative mb-4 group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-50 flex items-center justify-center">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-gray-200" />
              )}
            </div>
            
            {/* Can change photo only if it's the current user and they haven't changed it yet */}
            {isCurrentUser && !hasChangedAvatar && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white hover:bg-blue-700 transition-colors z-10"
                  title="Ubah Foto (1x Saja)"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            
            {isCurrentUser && hasChangedAvatar && (
              <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full shadow-lg border-2 border-white z-10">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Identity Section */}
          <div className="text-center w-full space-y-1 mb-5">
            <h3 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight truncate px-2">
              {employee.name}
            </h3>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
              <ShieldCheck className="w-3 h-3" />
              {employee.role}
            </div>
          </div>
          
          {/* Detailed Info Grid */}
          <div className="w-full grid grid-cols-1 gap-2 mb-6">
            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <Hash className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-black uppercase leading-none mb-0.5">NIK Karyawan</span>
                <span className="text-xs font-bold text-gray-700">{employee.nik || 'N/A'}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-black uppercase leading-none mb-0.5">User ID / ID Kurir</span>
                <span className="text-xs font-bold text-gray-700 font-mono">{employee.id}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 font-black uppercase leading-none mb-0.5">Station</span>
                <span className="text-xs font-bold text-gray-700">{employee.station || 'Tompobulu'}</span>
              </div>
            </div>
          </div>

          {/* QR Code Security Marker */}
          <div className="flex flex-col items-center">
            <div className="p-2 bg-white rounded-xl border-2 border-dashed border-gray-100">
              <QRCodeSVG value={employee.id} size={70} />
            </div>
            <span className="text-[8px] font-mono text-gray-300 mt-2 uppercase tracking-[0.2em]">Authorized Access Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;
