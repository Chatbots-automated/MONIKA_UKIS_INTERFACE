export function formatDateLT(date: string | Date | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTimeLT(date: string | Date | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('lt-LT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCurrencyLT(amount: number): string {
  return new Intl.NumberFormat('lt-LT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumberLT(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('lt-LT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getDateInputValue(date?: Date | string | null): string {
  if (!date) {
    return new Date().toISOString().split('T')[0];
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function calculateExpiryStatus(expiryDate: string | null, thresholds: { critical: number, warning: number, alert: number } = { critical: 7, warning: 14, alert: 30 }): 'expired' | 'critical' | 'warning' | 'alert' | 'ok' {
  if (!expiryDate) return 'ok';

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) return 'expired';

  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= thresholds.critical) return 'critical';
  if (daysUntilExpiry <= thresholds.warning) return 'warning';
  if (daysUntilExpiry <= thresholds.alert) return 'alert';

  return 'ok';
}

export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDaysToDate(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

export function calculateAgeFromDOB(dob: string | Date | null): number | null {
  if (!dob) return null;

  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();

  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months += today.getMonth() - birthDate.getMonth();

  if (today.getDate() < birthDate.getDate()) {
    months--;
  }

  return Math.max(0, months);
}
