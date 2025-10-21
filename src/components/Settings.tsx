import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, Save } from 'lucide-react';

interface SettingsData {
  low_stock_threshold: number;
  expiring_soon_days: number;
  expiring_warning_days: number;
  expiring_critical_days: number;
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    low_stock_threshold: 10,
    expiring_soon_days: 30,
    expiring_warning_days: 14,
    expiring_critical_days: 7,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Load from localStorage for now (could be moved to DB settings table)
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      localStorage.setItem('app_settings', JSON.stringify(settings));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-50 p-2 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sistemos nustatymai</h2>
            <p className="text-sm text-gray-600">Konfigūruoti slenkščius ir elgseną</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
            ✓ Nustatymai sėkmingai išsaugoti
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Atsargų slenksčiai</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mažos atsargos (vnt.)
                </label>
                <input
                  type="number"
                  value={settings.low_stock_threshold}
                  onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Produktai su likučiu mažesniu už šį skaičių bus pažymėti kaip "mažos atsargos"
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Galiojimo pabaigos įspėjimai</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Greitai pasibaigs (dienų)
                </label>
                <input
                  type="number"
                  value={settings.expiring_soon_days}
                  onChange={(e) => setSettings({ ...settings, expiring_soon_days: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pagrindiniame puslapyje rodomi produktai, kurių galiojimas baigiasi per šį laikotarpį
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Įspėjimas (dienų)
                </label>
                <input
                  type="number"
                  value={settings.expiring_warning_days}
                  onChange={(e) => setSettings({ ...settings, expiring_warning_days: parseInt(e.target.value) || 14 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="14"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Oranžinis žymiklis atsargose
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kritinis (dienų)
                </label>
                <input
                  type="number"
                  value={settings.expiring_critical_days}
                  onChange={(e) => setSettings({ ...settings, expiring_critical_days: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="7"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Raudonas žymiklis atsargose
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saugoma...' : 'Išsaugoti nustatymus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
