
const SHEET_ID = '1NSFmEGm3i1RgLCt1tSIaP9lYlfe8fnMMrsHeke_ZCiI';

const GIDS = {
  KURIR_LOGIN: '1904625355',
  OPS_LOGIN: '1000003188',
  TASKS: '1818009061',
  ATTENDANCE: '961433836'
};

const cleanString = (str: any): string => {
  if (!str) return '';
  return String(str)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Hapus zero-width characters
    .trim();
};

async function fetchCSV(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal akses GID ${gid}. Pastikan sheet 'Anyone with link can view'.`);
    const csvText = await response.text();
    
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
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

export const sheetService = {
  async getCourierLoginData() {
    const rows = await fetchCSV(GIDS.KURIR_LOGIN);
    const data = rows.slice(1).map(row => ({
      username: cleanString(row[5]),
      name: cleanString(row[1]) || cleanString(row[5])
    })).filter(u => u.username !== '');
    console.log(`Loaded ${data.length} courier login accounts`);
    return data;
  },

  async getOpsLoginData() {
    const rows = await fetchCSV(GIDS.OPS_LOGIN);
    const data = rows.slice(1).map(row => ({
      username: cleanString(row[4]),
      name: cleanString(row[1]) || cleanString(row[4])
    })).filter(u => u.username !== '');
    console.log(`Loaded ${data.length} ops login accounts`);
    return data;
  },

  async getTasks() {
    const rows = await fetchCSV(GIDS.TASKS);
    const tasks = rows.slice(1).map(row => {
      return {
        taskId: cleanString(row[0]),
        operatorName: cleanString(row[11]), // Mengambil dari Kolom L (Index 11)
        fmsId: cleanString(row[2]),
        packageCount: parseInt(row[9]) || 0,
        hub: cleanString(row[19]),
        name: cleanString(row[20]),
        courierId: cleanString(row[21]),
        status: 'pending' as const
      };
    }).filter(t => t.taskId !== '' && t.courierId !== '');
    console.log(`Loaded ${tasks.length} total tasks from cloud`);
    return tasks;
  },

  async getAttendance() {
    const rows = await fetchCSV(GIDS.ATTENDANCE);
    const data = rows.slice(1).map(row => ({
      staffName: cleanString(row[1]),
      jabatan: cleanString(row[2]),
      shift: cleanString(row[5]),
      description: cleanString(row[6])
    })).filter(a => a.staffName !== '');
    console.log(`Loaded ${data.length} attendance rows`);
    return data;
  }
};
