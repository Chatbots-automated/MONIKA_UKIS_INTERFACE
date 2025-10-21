export interface AppSettings {
  low_stock_threshold: number;
  expiring_soon_days: number;
  expiring_warning_days: number;
  expiring_critical_days: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  low_stock_threshold: 10,
  expiring_soon_days: 30,
  expiring_warning_days: 14,
  expiring_critical_days: 7,
};

export function getSettings(): AppSettings {
  const stored = localStorage.getItem('app_settings');
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem('app_settings', JSON.stringify(settings));
}
