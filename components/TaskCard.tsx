
import React, { useState } from 'react';
import { Task } from '../types';
import { ChevronDown, ChevronUp, Copy, CheckCircle, Package, MapPin, User, Hash, ShieldCheck, Calendar } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

interface TaskCardProps {
  fmsId: string;
  tasks: Task[];
  onFinishTask: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ fmsId, tasks, onFinishTask }) => {
  const [isOpen, setIsOpen] = useState(false);
  const mainTask = tasks[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div 
        className="p-2 sm:p-5 cursor-pointer flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="bg-blue-50 text-blue-600 text-[6px] sm:text-[10px] font-black px-1 sm:px-2.5 py-0 sm:py-1 rounded-[2px] sm:rounded-lg uppercase tracking-tight border border-blue-100/50">
              FMS: {fmsId}
            </span>
          </div>
          <h3 className="font-black text-gray-900 text-[10px] sm:text-xl tracking-tighter truncate leading-tight uppercase">{mainTask.name}</h3>
          <div className="flex flex-wrap gap-1 sm:gap-4 mt-0.5">
            <div className="flex items-center text-[7px] sm:text-sm font-bold text-gray-500 bg-gray-50 px-1 sm:px-3 py-0 sm:py-1.5 rounded-sm border border-gray-100">
              <User size={8} className="mr-0.5 text-blue-500 sm:w-3.5 sm:h-3.5" />
              <span>{mainTask.courierId}</span>
            </div>
            <div className="flex items-center text-[7px] sm:text-sm font-bold text-gray-500 bg-gray-50 px-1 sm:px-3 py-0 sm:py-1.5 rounded-sm border border-gray-100">
              <MapPin size={8} className="mr-0.5 text-red-500 sm:w-3.5 sm:h-3.5" />
              <span className="truncate max-w-[60px] sm:max-w-none">{mainTask.hub}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center ml-1 sm:ml-4 pl-1.5 sm:pl-4 border-l border-gray-100">
          <span className="text-sm sm:text-3xl font-black text-blue-600 leading-none">{tasks.length}</span>
          <span className="text-[6px] sm:text-[10px] uppercase font-black text-gray-400 mt-0 sm:mt-1 tracking-tighter">Tasks</span>
          <div className="mt-1 p-0.5 rounded-full bg-gray-50 text-gray-400 sm:mt-3 sm:p-1">
            {isOpen ? <ChevronUp size={10} className="sm:w-[18px] sm:h-[18px]" /> : <ChevronDown size={10} className="sm:w-[18px] sm:h-[18px]" />}
          </div>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="bg-gray-50/50 border-t border-gray-100 p-1.5 sm:p-5 space-y-1.5 sm:space-y-5">
            {tasks.map((task) => (
              <div key={task.taskId} className="bg-white p-2 sm:p-5 rounded-md sm:rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-1.5 sm:gap-4 mb-2 sm:mb-5">
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex items-center gap-1">
                      <Hash size={10} className="text-gray-400 sm:w-4 sm:h-4" />
                      <div>
                        <p className="text-[5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-tighter">TASK ID</p>
                        <span className="font-mono text-[9px] sm:text-base font-bold text-gray-800">{task.taskId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={10} className="text-emerald-500 sm:w-4 sm:h-4" />
                      <div>
                        <p className="text-[5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-tighter">TANGGAL</p>
                        <span className="text-[9px] sm:text-sm font-bold text-gray-700">{task.date || '-'}</span>
                      </div>
                    </div>
                    {task.operatorName && (
                      <div className="flex items-center gap-1">
                        <ShieldCheck size={10} className="text-blue-400 sm:w-4 sm:h-4" />
                        <div>
                          <p className="text-[5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-tighter">OPERATOR</p>
                          <span className="text-[9px] sm:text-sm font-bold text-gray-700 uppercase">{task.operatorName}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Package size={10} className="text-orange-400 sm:w-4 sm:h-4" />
                      <div>
                        <p className="text-[5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-tighter">PACK</p>
                        <span className="text-[9px] sm:text-sm font-bold text-gray-700">{task.packageCount} unit</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 w-full sm:w-auto">
                    <button 
                      onClick={() => handleCopy(task.taskId)}
                      className="flex-1 sm:flex-none p-1.5 sm:p-3 bg-white text-gray-600 rounded-md border border-gray-200 flex items-center justify-center gap-0.5"
                    >
                      <Copy size={10} className="sm:w-[18px] sm:h-[18px]" />
                      <span className="font-black text-[7px] sm:text-xs uppercase">Salin</span>
                    </button>
                    <button 
                      onClick={() => onFinishTask(task.taskId)}
                      disabled={task.status === 'finished'}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-0.5 px-2 sm:px-5 py-1.5 sm:py-3 rounded-md sm:rounded-xl font-black text-[8px] sm:text-sm ${
                        task.status === 'finished' 
                        ? 'bg-green-50 text-green-600' 
                        : 'bg-blue-600 text-white'
                      }`}
                    >
                      <CheckCircle size={10} className="sm:w-[18px] sm:h-[18px]" />
                      {task.status === 'finished' ? 'DONE' : 'FINISH'}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-center p-2 sm:p-6 bg-gray-50 rounded-md sm:rounded-2xl border border-dashed border-gray-200">
                  <QRCodeDisplay value={task.taskId} size={80} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;