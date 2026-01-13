
export enum Role {
  COURIER = 'Courier',
  OPERATOR = 'Operator',
  SHIFT_LEAD = 'Shift Lead',
  HUB_LEAD = 'Hub Lead',
  COURIER_DEDICATED = 'Courier Dedicated',
  COURIER_PLUS = 'Courier Plus',
  MITRA = 'Mitra'
}

export interface User {
  id: string;
  name: string;
  role: Role | string;
  station: string;
  password?: string;
  nik?: string;
  avatarUrl?: string;
}

export interface PackageData {
  station: string;
  dailyTotal: number;
  inProgress: number;
  completed: number;
}

export interface TaskItem {
  taskId: string;
  packageCount: number;
  deliveryDate: string;
  operator: string;
  station: string;
  isScanned?: boolean;
}

export interface AssignTask {
  courierId: string;
  courierName: string;
  courierRole: string;
  totalPackages: number;
  hub: string;
  tasks: TaskItem[];
}

export interface AttendanceRecord {
  id: string;
  opsId: string;
  name: string;
  shift: string;
  location: string;
  date: string;
  status: string;
  role?: string;
  remarks?: string;
}

export interface PromotionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  currentRole: Role | string;
  proposedRole: Role | string;
  requestedBy: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  feedback?: string;
}
