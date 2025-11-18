import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TEAT_POSITIONS } from './TeatSelector';

interface TeatStatus {
  id: string;
  teat_position: string;
  is_disabled: boolean;
  disabled_date: string | null;
  disabled_reason: string | null;
}

interface TeatStatusCardProps {
  animalId: string;
}

export function TeatStatusCard({ animalId }: TeatStatusCardProps) {
  const [teatStatuses, setTeatStatuses] = useState<TeatStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeatStatuses();
  }, [animalId]);

  const loadTeatStatuses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teat_status')
        .select('*')
        .eq('animal_id', animalId);

      if (!error && data) {
        setTeatStatuses(data);
      }
    } catch (error) {
      console.error('Error loading teat statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Spenų būsena</h4>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const disabledTeats = teatStatuses.filter(t => t.is_disabled);

  if (disabledTeats.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Spenų būsena</h4>
        <p className="text-sm text-green-700">✓ Visi spenys veikiantys</p>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">Spenų būsena</h4>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {TEAT_POSITIONS.map((teat) => {
          const status = teatStatuses.find(t => t.teat_position === teat.id);
          const isDisabled = status?.is_disabled || false;

          return (
            <div
              key={teat.id}
              className={`
                relative aspect-square rounded-lg border-2 transition-all
                ${isDisabled ? 'bg-gray-300 border-gray-500' : 'bg-green-100 border-green-400'}
              `}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-700">
                  {teat.label}
                </span>
                <span className="text-[10px] text-gray-600 mt-1">
                  {teat.side}
                </span>
              </div>

              {isDisabled && (
                <div className="absolute top-1 right-1 bg-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Išjungtas
                </div>
              )}
            </div>
          );
        })}
      </div>

      {disabledTeats.length > 0 && (
        <div className="bg-white rounded p-3 space-y-2">
          <div className="text-sm font-medium text-gray-900">
            Išjungti spenys: {disabledTeats.map(t => TEAT_POSITIONS.find(p => p.id === t.teat_position)?.label).join(', ')}
          </div>
          {disabledTeats.map(teat => (
            <div key={teat.id} className="text-xs text-gray-600 border-t border-gray-200 pt-2">
              <div><strong>{TEAT_POSITIONS.find(p => p.id === teat.teat_position)?.label}:</strong></div>
              {teat.disabled_date && (
                <div>Išjungtas: {new Date(teat.disabled_date).toLocaleDateString()}</div>
              )}
              {teat.disabled_reason && (
                <div>Priežastis: {teat.disabled_reason}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
