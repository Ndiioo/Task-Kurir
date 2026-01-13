
import { Role } from './types';

export const SHEET_URLS = {
  TASKS: 'https://docs.google.com/spreadsheets/d/1NSFmEGm3i1RgLCt1tSIaP9lYlfe8fnMMrsHeke_ZCiI/export?format=csv&gid=1818009061',
  ATTENDANCE: 'https://docs.google.com/spreadsheets/d/1NSFmEGm3i1RgLCt1tSIaP9lYlfe8fnMMrsHeke_ZCiI/export?format=csv&gid=961433836',
  COURIER_ACCESS: 'https://docs.google.com/spreadsheets/d/1NSFmEGm3i1RgLCt1tSIaP9lYlfe8fnMMrsHeke_ZCiI/export?format=csv&gid=1904625355',
  STAFF_ACCESS: 'https://docs.google.com/spreadsheets/d/1NSFmEGm3i1RgLCt1tSIaP9lYlfe8fnMMrsHeke_ZCiI/export?format=csv&gid=1000003188'
};

// Fix: Added missing roles to satisfy the Record<Role, string> type constraint
export const ROLE_COLORS: Record<Role, string> = {
  [Role.COURIER]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Role.OPERATOR]: 'bg-green-100 text-green-800 border-green-200',
  [Role.SHIFT_LEAD]: 'bg-purple-100 text-purple-800 border-purple-200',
  [Role.HUB_LEAD]: 'bg-red-100 text-red-800 border-red-200',
  [Role.COURIER_DEDICATED]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [Role.COURIER_PLUS]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [Role.MITRA]: 'bg-teal-100 text-teal-800 border-teal-200'
};

export const MOCK_TICKER_TEXT = "SELAMAT DATANG DI TOMPOBULU HUB - MONITORING HARIAN PAKET DAN PERFORMANCE STAFF - HARAP JAGA PROTOKOL KEAMANAN - SYNC DATA BERHASIL - SEMANGAT BEKERJA UNTUK SEMUA REKAN KURIR DAN OPS!";
