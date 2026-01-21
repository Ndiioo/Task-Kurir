
const SHEET_ID = '1NSFmEGm3i1RgLCt1tSIaP9lYlfe8fnMMrsHeke_ZCiI';

const GIDS = {
  KURIR_LOGIN: '1904625355',
  OPS_LOGIN: '1000003188',
  TASKS: '1818009061',
  ATTENDANCE: '961433836'
};

// Helper to clean strings from hidden characters often found in spreadsheets
const cleanString = (str: any): string => {
  if (!str) return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
    .trim();
};

async function fetchCSV(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Gagal mengambil data dari spreadsheet cloud.');
  const csvText = await response.text();
  
  // Robust parsing to handle potential commas inside quotes
  const rows = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  return rows.map(row => {
    const result = [];
    let startValueIndex = 0;
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '"') inQuotes = !inQuotes;
      if (row[i] === ',' && !inQuotes) {
        result.push(cleanString(row.substring(startValueIndex, i).replace(/^"|"$/g, '')));
        startValueIndex = i + 1;
      }
    }
    result.push(cleanString(row.substring(startValueIndex).replace(/^"|"$/g, '')));
    return result;
  });
}

export const sheetService = {
  async getCourierLoginData() {
    const rows = await fetchCSV(GIDS.KURIR_LOGIN);
    // Kolom F adalah Index 5
    return rows.slice(1).map(row => ({
      username: row[5] || '',
      name: row[1] || row[5] || '' 
    })).filter(u => u.username !== '');
  },

  async getOpsLoginData() {
    const rows = await fetchCSV(GIDS.OPS_LOGIN);
    // Kolom E adalah Index 4
    return rows.slice(1).map(row => ({
      username: row[4] || '',
      name: row[1] || row[4] || ''
    })).filter(u => u.username !== '');
  },

  async getTasks() {
    const rows = await fetchCSV(GIDS.TASKS);
    /**
     * Pemetaan Kolom Task sesuai spesifikasi:
     * Kolom A (Index 0): Task ID
     * Kolom C (Index 2): FMS ID
     * Kolom J (Index 9): Jumlah Paket
     * Kolom T (Index 19): Station / Hub
     * Kolom U (Index 20): Nama Kurir
     * Kolom V (Index 21): Id Kurir (Target sinkronisasi login)
     */
    const tasks = rows.slice(1).map(row => {
      return {
        taskId: row[0] || '',
        fmsId: row[2] || '',
        packageCount: parseInt(row[9]) || 0,
        hub: row[19] || '',
        name: row[20] || '',
        courierId: row[21] || '',
        status: 'pending' as const
      };
    }).filter(t => t.taskId !== '' && t.courierId !== '');
    
    console.log('Total tasks loaded from sheet:', tasks.length);
    return tasks;
  },

  async getAttendance() {
    const rows = await fetchCSV(GIDS.ATTENDANCE);
    /**
     * Mapping sesuai screenshot:
     * Index 1: Nama
     * Index 2: Jabatan
     * Index 5: Shift
     * Index 6: Keterangan
     */
    return rows.slice(1).map(row => ({
      staffName: row[1] || '',
      jabatan: row[2] || '',
      shift: row[5] || '',
      description: row[6] || ''
    })).filter(a => a.staffName !== '');
  }
};
