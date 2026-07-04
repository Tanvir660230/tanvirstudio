export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const str = String(v ?? '').replace(/"/g, '""');
    // Prefix formula-trigger characters to prevent CSV injection in Excel/LibreOffice
    const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${safe}"`;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
