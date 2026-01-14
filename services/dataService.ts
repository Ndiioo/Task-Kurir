
import { SHEET_URLS } from '../constants';
import { AssignTask, User, AttendanceRecord, Role, TaskItem } from '../types';

export const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return '';
  const s = id.toString().trim();
  const match = s.match(/\[(\d+)\]/);
  return match ? match[1] : s;
};

export const fetchCSV = async (url: string) => {
  try {
    const cacheBuster = `&cache_bust=${Date.now()}`;
    const response = await fetch(url + cacheBuster);
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
};

const parseCSV = (csv: string) => {
  const lines = csv.split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).filter(line => line.trim() !== '').map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    obj._raw = values; 
    return obj;
  });
};

export const updateUserInSpreadsheet = async (userId: string, updates: Partial<User>) => {
  try {
    if (!SHEET_URLS.UPDATE_ENDPOINT) return false;
    await fetch(SHEET_URLS.UPDATE_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'UPDATE_USER',
        userId: userId,
        timestamp: new Date().toISOString(),
        ...updates
      }),
    });
    return true;
  } catch (error) {
    console.error('Update failed:', error);
    return false;
  }
};

/**
 * Merekam aktivitas perubahan ke sheet "Perubahan Data Aplikasi"
 */
export const logActivityToSpreadsheet = async (activity: any) => {
  try {
    if (!SHEET_URLS.UPDATE_ENDPOINT) return false;
    await fetch(SHEET_URLS.UPDATE_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'LOG_ACTIVITY',
        sheetName: 'Perubahan Data Aplikasi',
        ...activity,
        timestamp: new Date().toISOString(),
      }),
    });
    return true;
  } catch (error) {
    console.error('Logging failed:', error);
    return false;
  }
};

export const updateTaskStatusInSpreadsheet = async (taskId: string, status: 'Scanned' | 'Unscanned') => {
  try {
    if (!SHEET_URLS.UPDATE_ENDPOINT) return false;
    await fetch(SHEET_URLS.UPDATE_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'UPDATE_TASK_STATUS',
        taskId: taskId,
        status: status,
        timestamp: new Date().toISOString(),
      }),
    });
    return true;
  } catch (error) {
    return false;
  }
};

export const getTasks = async (couriers: User[]): Promise<AssignTask[]> => {
  const data = await fetchCSV(SHEET_URLS.TASKS);
  const grouped: Record<string, AssignTask> = {};
  data.forEach((d: any) => {
    const pkgCount = parseInt(d['Jumlah Paket'] || d.PackageCount || d['Package Count'] || d._raw[2] || '0');
    if (isNaN(pkgCount) || pkgCount <= 0) return;
    const taskId = (d['Task ID'] || d.TaskID || d._raw[0] || '').trim();
    const deliveryDate = (d['Delivery Date'] || d._raw[1] || '').trim();
    const hub = (d['Station'] || d.Hub || d._raw[3] || 'Tompobulu Hub').trim();
    const courierName = (d['Nama Kurir'] || d['Nama kurir'] || d.CourierName || d._raw[4] || 'Unknown').trim();
    const rawFmsId = (d['FMS ID'] || d['Courier ID'] || d.CourierID || d.UserID || d._raw[1] || '').trim();
    const extractedId = normalizeId(rawFmsId);
    const rawOp = (d['Operator'] || d._raw[5] || '').trim();
    const operator = rawOp.includes(']') ? rawOp.split(']')[1].trim() : rawOp;
    if (!taskId) return;
    const groupId = extractedId || courierName;
    if (!grouped[groupId]) {
      const courier = couriers.find(c => c.id === extractedId || c.name === courierName);
      grouped[groupId] = {
        courierId: extractedId || 'N/A',
        courierName: courierName,
        courierRole: courier?.role || 'Kurir',
        totalPackages: 0,
        hub: hub,
        tasks: []
      };
    }
    grouped[groupId].totalPackages += pkgCount;
    grouped[groupId].tasks.push({
      taskId: taskId, packageCount: pkgCount, deliveryDate: deliveryDate,
      operator: operator || 'Hub Staff', station: hub, isScanned: false
    });
  });
  return Object.values(grouped);
};

export const getAttendance = async (staffUsers: User[]): Promise<AttendanceRecord[]> => {
  const data = await fetchCSV(SHEET_URLS.ATTENDANCE);
  return data.map((d: any, i: number) => {
    const opsId = normalizeId(d['Ops ID'] || d._raw[0] || '');
    const name = d['Nama'] || d._raw[1] || 'Unnamed Staff';
    const rawStatus = (d['Status'] || d._raw[2] || '').trim();
    const location = d['Lokasi'] || d._raw[3] || '-';
    const shift = d['Shift'] || d._raw[4] || '-';
    const remarks = d['Keterangan'] || d._raw[5] || '';
    const status = rawStatus.toLowerCase() === 'hadir' ? 'Hadir' : 'Off';
    const user = staffUsers.find(u => u.name.toLowerCase() === name.toLowerCase() || u.id === opsId);
    return {
      id: `att-${i}`, opsId, name, shift, location, date: new Date().toLocaleDateString(),
      status, role: user?.role || 'Operator', remarks
    };
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  const courierData = await fetchCSV(SHEET_URLS.COURIER_ACCESS);
  const staffData = await fetchCSV(SHEET_URLS.STAFF_ACCESS);
  const couriers: User[] = courierData.map((d: any) => ({
    id: normalizeId(d.UserID || d['User ID'] || d['FMS ID'] || 'C000'),
    name: d['Nama Lengkap'] || d.Name || d['Nama Kurir'] || 'Courier',
    role: d.Jabatan || Role.COURIER,
    station: d.Station || 'Tompobulu',
    password: d.Password || '123456',
    nik: d.NIK || '1234567890',
    avatarUrl: d.AvatarUrl || d.Avatar || d['Avatar Url'] || d.Foto || '',
    photoChangeCount: parseInt(d.PhotoChangeCount || d['Photo Change Count'] || '0')
  })).filter(u => !(u.name === 'Courier' && u.role === Role.COURIER));
  const staff: User[] = staffData.map((d: any) => ({
    id: normalizeId(d.UserID || d['User ID'] || d['Ops ID'] || 'S000'),
    name: d['Nama Lengkap'] || d.Name || d['Nama Staff'] || 'Staff',
    role: d.Jabatan || d.Role || Role.OPERATOR,
    station: d.Station || 'Tompobulu',
    password: d.Password || 'admin123',
    nik: d.NIK || '0987654321',
    avatarUrl: d.AvatarUrl || d.Avatar || d['Avatar Url'] || d.Foto || '',
    photoChangeCount: parseInt(d.PhotoChangeCount || d['Photo Change Count'] || '0')
  }));
  return [...couriers, ...staff];
};
