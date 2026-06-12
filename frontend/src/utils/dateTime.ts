export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw === '-') return null;

  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}[T\s]\d{1,2}:\d{2}/.test(raw)) {
    const d = new Date(raw.replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}/.test(raw)) {
    const [datePart, timePart] = raw.split(/\s+/);
    const [y,m,d0] = datePart.split('/').map(Number);
    const iso = `${y}-${String(m).padStart(2,'0')}-${String(d0).padStart(2,'0')}T${timePart}Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatJst(value?: string | null): string {
  const d = parseApiDate(value);
  if (!d) return value || '-';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function monitoringLastCheckJst(row: any): string {
  const value =
    row?.last_checked_at ??
    row?.last_checked ??
    row?.last_check ??
    row?.checked_at ??
    row?.checkedAt ??
    row?.lastChecked ??
    row?.lastCheckedAt ??
    row?.last_result_at ??
    row?.lastResultAt ??
    row?.result_at ??
    row?.resultAt ??
    row?.updated_at ??
    row?.updatedAt ??
    row?.timestamp ??
    '';
  return formatJst(value);
}
