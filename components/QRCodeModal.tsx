
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Scan, CheckCircle, User as UserIcon, Calendar, MapPin } from 'lucide-react';
import { AssignTask, TaskItem } from '../types';

interface QRCodeModalProps {
  taskGroup: AssignTask;
  onClose: () => void;
  scannedTaskIds: Set<string>;
  onToggleScan: (taskId: string) => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ taskGroup, onClose, scannedTaskIds, onToggleScan }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (task: TaskItem) => {
    // Jika task sudah selesai scan, fungsi salin dinonaktifkan
    if (scannedTaskIds.has(task.taskId)) return;

    // Hanya menyalin Task ID saja ke clipboard sesuai instruksi
    const text = task.taskId;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(task.taskId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Gagal menyalin Task ID: ', err);
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black text-gray-900 leading-tight">Detail Assign Task</h3>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">{taskGroup.courierName} • {taskGroup.courierId}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-red-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar bg-gray-50/50">
          {taskGroup.tasks.map((task, idx) => {
            const isScanned = scannedTaskIds.has(task.taskId);
            const isCopied = copiedId === task.taskId;
            
            return (
              <div key={task.taskId} className={`p-4 rounded-2xl border transition-all ${isScanned ? 'bg-green-50/50 border-green-200 shadow-inner' : 'bg-white border-gray-200 shadow-sm hover:border-blue-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black text-blue-500 tracking-tighter block">Assign Task {idx + 1}</span>
                    <span className="font-mono text-sm font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{task.taskId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-gray-900 leading-none block">{task.packageCount}</span>
                    <span className="text-[9px] uppercase font-black text-gray-400 tracking-widest block">Paket</span>
                  </div>
                </div>

                <div className="flex justify-center mb-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-inner group relative">
                  <QRCodeSVG value={task.taskId} size={160} />
                  {isScanned && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center rounded-2xl animate-in fade-in duration-300">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Selesai Scan</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 mb-5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                    <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Ops: {task.operator}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span>Tgl: {task.deliveryDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>Hub: {task.station}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    onClick={() => handleCopy(task)}
                    disabled={isScanned}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                      isScanned 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : isCopied 
                          ? 'bg-green-600 text-white shadow-lg' 
                          : 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'Disalin' : 'Salin AT'}
                  </button>
                  <button 
                    onClick={() => onToggleScan(task.taskId)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                      isScanned ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-100 active:scale-95'
                    }`}
                  >
                    {isScanned ? <CheckCircle className="w-3.5 h-3.5" /> : <Scan className="w-3.5 h-3.5" />}
                    {isScanned ? 'Selesai' : 'Selesai Scan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Progress Scan</span>
              <span className="text-sm font-black text-gray-900">
                {taskGroup.tasks.filter(t => scannedTaskIds.has(t.taskId)).length} / {taskGroup.tasks.length} Task
              </span>
            </div>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
