
export type Role = 'kurir' | 'ops';

export interface User {
  username: string;
  name: string;
  role: Role;
}

export interface CourierUser {
  username: string;
  name: string;
}

export interface OpsUser {
  username: string;
  name: string;
}

export interface Task {
  fmsId: string;
  courierId: string;
  name: string;
  operatorName?: string;
  hub: string;
  taskId: string;
  packageCount: number;
  status?: 'pending' | 'finished';
}

export interface Attendance {
  staffName: string;
  jabatan: string;
  shift: string;
  description: string;
}

export interface AppState {
  user: User | null;
  tasks: Task[];
  attendance: Attendance[];
  isLoading: boolean;
  error: string | null;
}
