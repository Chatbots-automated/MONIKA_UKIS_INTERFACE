import { useState, useEffect } from 'react';
import { HoofLeg, HoofClaw } from '../lib/types';
import { supabase } from '../lib/supabase';
import { Clock, Activity } from 'lucide-react';
import { HOOF_SELECTOR_DATA } from './hoof/hoofSelectorData';
import { HOOF_ZONE_DATA } from './hoof/hoofZoneData';

interface HoofInterfaceNewProps {
  selectedLeg: HoofLeg | null;
  selectedClaw: HoofClaw | null;
  selectedZone: number | null;
  selectedZones?: Array<{ zone: number; claw: HoofClaw }>;
  onLegSelect: (leg: HoofLeg) => void;
  onClawSelect: (claw: HoofClaw) => void;
  onZoneSelect: (zone: number) => void;
  examinedZones: Set<string>;
  animalId?: string;
}

interface HoofHistory {
  id: string;
  examination_date: string;
  leg: HoofLeg;
  claw: string;
  zone: number | null;
  condition_code: string;
  severity: number;
  was_treated: boolean;
  treatment_product_id: string | null;
  technician_name: string;
  condition?: {
    name_lt: string;
    name_en: string;
  };
  product?: {
    name: string;
  };
}

// Map hoof selector data to leg codes
const HOOF_LEG_MAP: Record<string, HoofLeg> = {
  "Front Left": "FL",
  "Front Right": "FR",
  "Back Left": "HL",
  "Back Right": "HR"
};

// Lithuanian labels for hoofs
const HOOF_LABELS: Record<HoofLeg, string> = {
  "FL": "Priekinė Kairė",
  "FR": "Priekinė Dešinė",
  "HL": "Galinė Kairė",
  "HR": "Galinė Dešinė"
};

const ZONE_NAMES: Record<number, string> = {
  0: "Tarppiršlio erdvė",
  1: "Nago siena",
  2: "Šoninė siena",
  3: "Baltoji linija",
  4: "Padas",
  5: "Pado-kulno sąnaras",
  6: "Kulnas / Pagalvėlė",
  10: "Bendra kulno pagalvėlė"
};

export function HoofInterfaceNew({
  selectedLeg,
  selectedClaw,
  selectedZone,
  selectedZones = [],
  onLegSelect,
  onClawSelect,
  onZoneSelect,
  examinedZones,
  animalId
}: HoofInterfaceNewProps) {
  const [screen, setScreen] = useState<'legs' | 'zones'>('legs');
  const [history, setHistory] = useState<HoofHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reset screen to 'legs' when parent resets selectedLeg (after saving examination)
  useEffect(() => {
    if (!selectedLeg) {
      setScreen('legs');
    }
  }, [selectedLeg]);

  // Load history when entering zones screen
  useEffect(() => {
    if (screen === 'zones' && animalId) {
      loadHistory();
    }
  }, [screen, animalId]);

  const loadHistory = async () => {
    if (!animalId) return;

    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('hoof_records')
        .select(`
          *,
          condition:hoof_condition_codes(name_lt, name_en),
          product:products(name)
        `)
        .eq('animal_id', animalId)
        .order('examination_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading hoof history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleHoofClick = (leg: HoofLeg) => {
    onLegSelect(leg);
    setScreen('zones');
  };

  const handleZoneClick = (zoneKey: string) => {
    // Parse zone key like "left_1" or "right_6" or "center_0"
    const parts = zoneKey.split('_');
    const side = parts[0]; // "left", "right", "center"
    const zoneNum = parseInt(parts[1], 10);

    // Determine claw based on side
    const claw = side === 'left' ? 'inner' : side === 'right' ? 'outer' : 'inner';
    
    // Just pass to parent - parent handles the toggle logic
    onZoneSelect(zoneNum);
    onClawSelect(claw);
  };

  const handleBack = () => {
    setScreen('legs');
  };

  const getClawText = (claw: HoofClaw | null) => {
    if (claw === 'inner') return 'Kairysis nagas';
    if (claw === 'outer') return 'Dešinysis nagas';
    return 'Centras';
  };

  // Convert points array to SVG polygon points string
  const pointsToString = (points: number[][]) => {
    return points.map(p => `${p[0]},${p[1]}`).join(' ');
  };

  if (screen === 'legs') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-1">
            1 žingsnis iš 2
          </h3>
          <h2 className="text-xl font-bold text-gray-900">Pasirinkite pažeistą nagą</h2>
        </div>

        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="relative w-full max-w-4xl mx-auto bg-white rounded-lg overflow-hidden">
            {/* Background reference image */}
            <img 
              src="https://i.imgur.com/X3M1tuk.png" 
              alt="Hoof selector"
              className="w-full h-auto block"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            />
            
            {/* Interactive SVG overlay */}
            <svg 
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ zIndex: 5 }}
            >
              {/* Render all hoofs as transparent clickable areas */}
              {Object.entries(HOOF_SELECTOR_DATA).map(([hoofKey, hoof]) => {
                const leg = HOOF_LEG_MAP[hoof.group];
                const isSelected = selectedLeg === leg;

                return (
                  <polygon
                    key={hoofKey}
                    points={pointsToString(hoof.points)}
                    fill={isSelected ? "rgba(255, 125, 45, 0.34)" : "rgba(0, 140, 255, 0)"}
                    stroke={isSelected ? "#ff7d2d" : "transparent"}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    style={{
                      cursor: 'pointer',
                      transition: 'fill 0.12s ease, stroke 0.12s ease',
                      vectorEffect: 'non-scaling-stroke'
                    }}
                    onClick={() => handleHoofClick(leg)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.setAttribute('fill', 'rgba(0, 140, 255, 0.16)');
                        e.currentTarget.setAttribute('stroke', 'rgba(0, 140, 255, 0.82)');
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.setAttribute('fill', 'rgba(0, 140, 255, 0)');
                        e.currentTarget.setAttribute('stroke', 'transparent');
                      }
                    }}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Show selected hoof info */}
        {selectedLeg && (
          <div className="bg-white border border-gray-300 rounded-lg p-4 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider text-gray-500 font-mono mb-1">
                Pasirinkta
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {HOOF_LABELS[selectedLeg]}
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-mono">
                {selectedLeg}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Screen 2: Zones
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-base font-medium"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Grįžti
        </button>

        <div className="text-center">
          <div className="text-base font-semibold uppercase tracking-wider text-gray-600">
            2 žingsnis iš 2 · Pasirinkite zoną
          </div>
          <div className="text-lg font-bold text-gray-900">
            {selectedLeg ? HOOF_LABELS[selectedLeg] : ''}
          </div>
        </div>

        <div className="w-28"></div>
      </div>
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <div className="relative w-full max-w-4xl mx-auto bg-white rounded-lg overflow-hidden">
          {/* Background reference image */}
          <img 
            src="/hoof-zones-reference.png" 
            alt="Hoof zones reference"
            className="w-full h-auto block"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          />
          
          {/* Interactive SVG overlay */}
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ zIndex: 5 }}
          >
            {/* Render all zones as transparent clickable areas */}
            {Object.entries(HOOF_ZONE_DATA).map(([zoneKey, points]) => {
              // Parse zoneKey to extract zone number and determine claw
              const parts = zoneKey.split('_');
              const side = parts[0]; // "left", "right", "center"
              const zoneNum = parseInt(parts[1], 10);
              const zoneClaw = side === 'left' ? 'inner' : side === 'right' ? 'outer' : 'inner';
              
              // Check if this zone is in the selectedZones array
              const isSelected = selectedZones.some(z => z.zone === zoneNum && z.claw === zoneClaw);

              return (
                <polygon
                  key={zoneKey}
                  points={pointsToString(points)}
                  fill={isSelected ? "rgba(255, 80, 60, 0.30)" : "rgba(0, 140, 255, 0)"}
                  stroke={isSelected ? "#ff513d" : "transparent"}
                  strokeWidth="2.1"
                  strokeLinejoin="round"
                  className="zone-path"
                  style={{
                    cursor: 'pointer',
                    transition: 'fill 0.12s ease, stroke 0.12s ease',
                    vectorEffect: 'non-scaling-stroke'
                  }}
                  onClick={() => handleZoneClick(zoneKey)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.setAttribute('fill', 'rgba(0, 140, 255, 0.16)');
                      e.currentTarget.setAttribute('stroke', 'rgba(0, 140, 255, 0.8)');
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.setAttribute('fill', 'rgba(0, 140, 255, 0)');
                      e.currentTarget.setAttribute('stroke', 'transparent');
                    }
                  }}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selection Info */}
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-1">Nagas</div>
              <div className="font-semibold">{selectedLeg ? HOOF_LABELS[selectedLeg] : ''}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-1">Pasirinktos zonos</div>
              <div className="font-semibold text-blue-600">
                {selectedZones.length > 0 ? selectedZones.length : '—'}
              </div>
            </div>
          </div>
          
          {selectedZones.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-2">Pasirinktos</div>
              <div className="flex flex-wrap gap-2">
                {selectedZones.map((z, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-mono font-semibold border border-red-300"
                  >
                    Z{z.zone} · {z.claw === 'inner' ? 'K' : 'D'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 font-mono text-center p-3 bg-gray-50 border border-gray-200 rounded">
        💡 Paspauskite zonas, kad jas pasirinktumėte. Galite pasirinkti keletą zonų vienu metu.
      </div>

      {/* History Section */}
      {animalId && (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Ankstesnės apžiūros</h3>
              {!loadingHistory && history.length > 0 && (
                <span className="text-xs text-gray-500 font-mono">({history.length})</span>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loadingHistory ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Kraunama...
              </div>
            ) : history.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Nėra ankstesnių apžiūrų
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {history.map((record) => (
                  <div 
                    key={record.id} 
                    className={`p-3 hover:bg-gray-50 transition-colors ${
                      record.leg === selectedLeg ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">
                            {new Date(record.examination_date).toLocaleDateString('lt')}
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            {record.leg} - {record.claw === 'inner' ? 'Vidinis' : 'Išorinis'}
                          </span>
                          {record.zone !== null && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs font-mono">
                              Z{record.zone}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-700">
                            {record.condition?.name_lt || record.condition_code}
                          </span>
                          
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium
                            ${record.severity === 0 ? 'bg-green-100 text-green-800' : ''}
                            ${record.severity === 1 ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${record.severity === 2 ? 'bg-orange-100 text-orange-800' : ''}
                            ${record.severity === 3 ? 'bg-red-100 text-red-800' : ''}
                            ${record.severity === 4 ? 'bg-red-200 text-red-900' : ''}
                          `}>
                            S{record.severity}
                          </span>

                          {record.was_treated && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Gydyta
                            </span>
                          )}
                        </div>

                        {record.product && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {record.product.name}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 font-mono whitespace-nowrap">
                        {record.technician_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
