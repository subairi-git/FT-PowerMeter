export const formatRupiah = (val: number, includeDecimals = false): string => {
  if (isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: includeDecimals ? 2 : 0,
    minimumFractionDigits: 0,
  }).format(val);
};

export const formatWatts = (watts: number): string => {
  if (isNaN(watts)) return '0 W';
  if (Math.abs(watts) >= 1000) {
    return `${(watts / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW`;
  }
  return `${watts.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} W`;
};

export const formatNumber = (num: number, decimals = 2): string => {
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatKWh = (kwh: number): string => {
  if (isNaN(kwh)) return '0 kWh';
  return `${kwh.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kWh`;
};

export const formatDateIndo = (dateStr: string | Date): string => {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

export const formatTimeIndo = (dateStr: string | Date): string => {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
};
