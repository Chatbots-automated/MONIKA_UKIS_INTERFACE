import { useState, useEffect } from 'react';

interface TeatSelectorProps {
  selectedSickTeats: string[];
  selectedDisabledTeats: string[];
  onSickTeatsChange: (teats: string[]) => void;
  onDisabledTeatsChange: (teats: string[]) => void;
  readonly?: boolean;
}

const TEAT_POSITIONS = [
  { id: 'k1', label: 'K1', side: 'Kairė priekis' },
  { id: 'k2', label: 'K2', side: 'Kairė užpakalis' },
  { id: 'd1', label: 'D1', side: 'Dešinė priekis' },
  { id: 'd2', label: 'D2', side: 'Dešinė užpakalis' },
];

export function TeatSelector({
  selectedSickTeats,
  selectedDisabledTeats,
  onSickTeatsChange,
  onDisabledTeatsChange,
  readonly = false,
}: TeatSelectorProps) {
  const toggleSick = (teatId: string) => {
    if (readonly) return;

    if (selectedSickTeats.includes(teatId)) {
      onSickTeatsChange(selectedSickTeats.filter(t => t !== teatId));
    } else {
      onSickTeatsChange([...selectedSickTeats, teatId]);
    }
  };

  const toggleDisabled = (teatId: string) => {
    if (readonly) return;

    if (selectedDisabledTeats.includes(teatId)) {
      onDisabledTeatsChange(selectedDisabledTeats.filter(t => t !== teatId));
    } else {
      onDisabledTeatsChange([...selectedDisabledTeats, teatId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-8">
        {TEAT_POSITIONS.map((teat) => {
          const isSick = selectedSickTeats.includes(teat.id);
          const isDisabled = selectedDisabledTeats.includes(teat.id);

          return (
            <div key={teat.id} className="space-y-3">
              <div className="text-sm font-bold text-gray-700 text-center uppercase tracking-wide">
                {teat.side}
              </div>

              <div
                className={`
                  relative w-full rounded-xl border-4 transition-all shadow-lg
                  ${readonly ? 'cursor-default' : 'cursor-pointer hover:shadow-2xl hover:scale-105'}
                  ${isSick ? 'bg-gradient-to-br from-red-100 to-red-200 border-red-600' : ''}
                  ${isDisabled ? 'bg-gradient-to-br from-gray-300 to-gray-400 border-gray-600' : ''}
                  ${!isSick && !isDisabled ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-400' : ''}
                `}
                style={{ aspectRatio: '1', minHeight: '140px' }}
                onClick={() => !readonly && !isDisabled && toggleSick(teat.id)}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-gray-800 mb-2">
                    {teat.label}
                  </span>
                  <span className="text-xs text-gray-600 font-medium">
                    Spenelis
                  </span>
                </div>

                {isSick && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-md">
                    🔴 Sergantis
                  </div>
                )}

                {isDisabled && (
                  <div className="absolute top-2 right-2 bg-gray-800 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-md">
                    ⚫ Išjungtas
                  </div>
                )}
              </div>

              {!readonly && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSick(teat.id)}
                    disabled={isDisabled}
                    className={`
                      flex-1 text-sm font-semibold py-3 rounded-lg transition-all transform
                      ${isSick
                        ? 'bg-red-600 text-white shadow-lg scale-105'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border-2 border-red-300'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                    `}
                  >
                    {isSick ? '✓ Sergantis' : 'Sergantis'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleDisabled(teat.id)}
                    className={`
                      flex-1 text-sm font-semibold py-3 rounded-lg transition-all transform
                      ${isDisabled
                        ? 'bg-gray-800 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                      }
                      hover:scale-105
                    `}
                  >
                    {isDisabled ? '✓ Išjungtas' : 'Išjungtas'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(selectedSickTeats.length > 0 || selectedDisabledTeats.length > 0) && (
        <div className="text-base bg-white border-2 border-blue-300 p-4 rounded-lg shadow-sm">
          {selectedSickTeats.length > 0 && (
            <div className="mb-2">
              <span className="font-bold text-red-700">🔴 Sergantys spenys:</span>{' '}
              <span className="text-gray-900 font-semibold">
                {selectedSickTeats.map(t => TEAT_POSITIONS.find(p => p.id === t)?.label).join(', ')}
              </span>
            </div>
          )}
          {selectedDisabledTeats.length > 0 && (
            <div>
              <span className="font-bold text-gray-700">⚫ Išjungti spenys:</span>{' '}
              <span className="text-gray-900 font-semibold">
                {selectedDisabledTeats.map(t => TEAT_POSITIONS.find(p => p.id === t)?.label).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TeatDisplay({ sickTeats, disabledTeats }: { sickTeats: string[]; disabledTeats: string[] }) {
  if (!sickTeats?.length && !disabledTeats?.length) return null;

  return (
    <div className="text-sm space-y-1">
      {sickTeats?.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
            Sergantys spenys:
          </span>
          <span className="text-gray-700">
            {sickTeats.map(t => TEAT_POSITIONS.find(p => p.id === t)?.label).join(', ')}
          </span>
        </div>
      )}
      {disabledTeats?.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium">
            Išjungti spenys:
          </span>
          <span className="text-gray-700">
            {disabledTeats.map(t => TEAT_POSITIONS.find(p => p.id === t)?.label).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}

export { TEAT_POSITIONS };
