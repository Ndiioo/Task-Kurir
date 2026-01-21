
import React from 'react';
import { Attendance } from '../types';
import { CalendarDays, Clock } from 'lucide-react';

interface AttendanceTableProps {
  data: Attendance[];
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ data }) => {
  return (
    <div className="space-y-1.5 sm:space-y-4">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[9px] sm:text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-1">
          <CalendarDays className="text-blue-600 sm:w-5 sm:h-5" size={12} /> Jadwal
        </h2>
        <div className="bg-blue-600 text-white px-1 sm:px-3 py-0.5 rounded-sm sm:rounded-full text-[7px] sm:text-[10px] font-black uppercase">
          {data.length} STAFF
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-dashed border-gray-100 text-center flex flex-col items-center">
          <Clock size={16} className="text-gray-200 mb-1" />
          <p className="text-gray-800 font-black text-[8px] uppercase">Data Kosong</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg sm:rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#8B0000] text-white">
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[11px] font-black uppercase tracking-tighter border-r border-white/10">
                    NAMA
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[11px] font-black uppercase tracking-tighter border-r border-white/10">
                    JABATAN
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[11px] font-black uppercase tracking-tighter border-r border-white/10">
                    SHIFT
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-[7px] sm:text-[11px] font-black uppercase tracking-tighter">
                    KET
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}
                  >
                    <td className="px-2 sm:px-6 py-1.5 sm:py-4 text-[8px] sm:text-sm font-bold text-gray-800 uppercase tracking-tighter whitespace-nowrap">
                      {item.staffName}
                    </td>
                    <td className="px-2 sm:px-6 py-1.5 sm:py-4 text-[7px] sm:text-xs font-semibold text-gray-400 italic whitespace-nowrap">
                      {item.jabatan || '-'}
                    </td>
                    <td className="px-2 sm:px-6 py-1.5 sm:py-4 whitespace-nowrap">
                      <span className={`px-1 sm:px-3 py-0 sm:py-1 rounded-[2px] sm:rounded-lg text-[7px] sm:text-[10px] font-black uppercase tracking-tighter ${
                        item.shift.toLowerCase().includes('off') 
                        ? 'bg-red-50 text-red-600' 
                        : 'bg-blue-50 text-blue-700'
                      }`}>
                        {item.shift || '-'}
                      </span>
                    </td>
                    <td className="px-2 sm:px-6 py-1.5 sm:py-4 text-[7px] sm:text-xs font-medium text-gray-500 min-w-[80px] sm:min-w-[200px] leading-tight">
                      {item.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
