import { useState, useEffect } from 'react';
import { HoofLeg, HoofClaw } from '../lib/types';
import { supabase } from '../lib/supabase';
import { Clock, Activity, ChevronDown, ChevronRight } from 'lucide-react';
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
  treatment_quantity: number | null;
  treatment_unit: string | null;
  treatment_batch_no: string | null;
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
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Reset screen to 'legs' when parent resets selectedLeg (after saving examination)
  useEffect(() => {
    if (!selectedLeg) {
      setScreen('legs');
    }
  }, [selectedLeg]);

  // Load history when animalId changes or screen changes
  useEffect(() => {
    if (animalId) {
      loadHistory();
    }
  }, [animalId, screen]);

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
    
    // Pass claw as second parameter to avoid double state updates
    onZoneSelect(zoneNum, claw);
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
      <div className="space-y-4">
        <div className="text-center mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-0.5">
            1 žingsnis iš 2
          </h3>
          <h2 className="text-lg font-bold text-gray-900">Pasirinkite pažeistą nagą</h2>
        </div>

        {/* Previous visits summary */}
        {animalId && history.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 justify-center">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-800 font-medium">
                Ankstesnės apžiūros: {Array.from(new Set(history.map(h => h.examination_date)))
                  .slice(0, 5)
                  .map(date => new Date(date).toLocaleDateString('lt'))
                  .join(', ')}
                {Array.from(new Set(history.map(h => h.examination_date))).length > 5 && 
                  ` (+${Array.from(new Set(history.map(h => h.examination_date))).length - 5})`}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-300 rounded-lg p-3">
          <div className="relative w-full max-w-3xl mx-auto bg-white rounded-lg overflow-hidden">
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
          <div className="bg-white border border-gray-300 rounded-lg p-3 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-0.5">
                Pasirinkta
              </div>
              <div className="text-xl font-bold text-gray-900 mb-1">
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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Grįžti
        </button>

        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">
            2 žingsnis iš 2 · Pasirinkite zoną
          </div>
          <div className="text-base font-bold text-gray-900">
            {selectedLeg ? HOOF_LABELS[selectedLeg] : ''}
          </div>
        </div>

        <div className="w-20"></div>
      </div>
      <div className="bg-white border border-gray-300 rounded-lg p-3">
        <div className="relative w-full max-w-3xl mx-auto bg-white rounded-lg overflow-hidden">
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
      <div className="bg-white border border-gray-300 rounded-lg p-2.5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-0.5">Nagas</div>
              <div className="text-sm font-semibold">{selectedLeg ? HOOF_LABELS[selectedLeg] : ''}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-0.5">Pasirinktos zonos</div>
              <div className="text-sm font-semibold text-blue-600">
                {selectedZones.length > 0 ? selectedZones.length : '—'}
              </div>
            </div>
          </div>
          
          {selectedZones.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1">Pasirinktos</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedZones.map((z, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[11px] font-mono font-semibold border border-red-300"
                  >
                    Z{z.zone} · {z.claw === 'inner' ? 'K' : 'D'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-gray-500 font-mono text-center p-2 bg-gray-50 border border-gray-200 rounded">
        💡 Paspauskite zonas, kad jas pasirinktumėte. Galite pasirinkti keletą zonų vienu metu.
      </div>

      {/* History Section */}
      {animalId && (
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-gray-300">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <h3 className="text-xs font-semibold text-gray-900">Ankstesnės apžiūros</h3>
              {!loadingHistory && history.length > 0 && (
                <span className="text-[10px] text-gray-500 font-mono">({history.length})</span>
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {loadingHistory ? (
              <div className="p-3 text-center text-xs text-gray-500">
                Kraunama...
              </div>
            ) : history.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-500">
                Nėra ankstesnių apžiūrų
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {(() => {
                  // Group records by session (date + leg + technician)
                  const grouped = history.reduce((acc, record) => {
                    const sessionKey = `${record.examination_date}_${record.leg}_${record.technician_name || 'unknown'}`;
                    if (!acc[sessionKey]) {
                      acc[sessionKey] = [];
                    }
                    acc[sessionKey].push(record);
                    return acc;
                  }, {} as Record<string, typeof history>);

                  return Object.entries(grouped).map(([sessionKey, records]) => {
                    // Sort records by zone and claw for consistent display
                    const sortedRecords = records.sort((a, b) => {
                      if (a.claw !== b.claw) return a.claw === 'inner' ? -1 : 1;
                      return (a.zone ?? 0) - (b.zone ?? 0);
                    });

                    const firstRecord = sortedRecords[0];
                    const allZones = sortedRecords
                      .filter(r => r.zone !== null)
                      .map(r => `${r.claw === 'inner' ? 'V' : 'I'}-Z${r.zone}`)
                      .join(', ');
                    
                    // Collect products with details
                    const productDetails = sortedRecords
                      .filter(r => r.product)
                      .map(r => ({
                        name: r.product!.name,
                        quantity: r.treatment_quantity,
                        unit: r.treatment_unit,
                        batch: r.treatment_batch_no
                      }));
                    
                    // Get unique product names for summary
                    const uniqueProducts = Array.from(
                      new Set(productDetails.map(p => p.name))
                    );

                    const isExpanded = expandedSessions.has(sessionKey);
                    
                    const toggleExpand = () => {
                      setExpandedSessions(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(sessionKey)) {
                          newSet.delete(sessionKey);
                        } else {
                          newSet.add(sessionKey);
                        }
                        return newSet;
                      });
                    };

                    return (
                      <div 
                        key={sessionKey}
                        className={`transition-colors ${
                          firstRecord.leg === selectedLeg ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div 
                          className="p-2 hover:bg-gray-50 cursor-pointer"
                          onClick={toggleExpand}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {productDetails.length > 0 && (
                                  isExpanded ? 
                                    <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" /> :
                                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                )}
                                <span className="text-[10px] font-mono text-gray-500">
                                  {new Date(firstRecord.examination_date).toLocaleDateString('lt')}
                                </span>
                                <span className="text-[11px] font-semibold text-gray-900">
                                  {firstRecord.leg}
                                </span>
                                {sortedRecords.length > 1 && (
                                  <span className="px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                                    {sortedRecords.length} zonos
                                  </span>
                                )}
                              </div>
                              
                              {allZones && (
                                <div className="text-[10px] text-gray-600 mb-0.5 ml-4">
                                  Zonos: {allZones}
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 flex-wrap ml-4">
                                <span className="text-[11px] text-gray-700">
                                  {firstRecord.condition?.name_lt || firstRecord.condition_code}
                                </span>
                                
                                <span className={`px-1 py-0.5 rounded text-[10px] font-medium
                                  ${firstRecord.severity === 0 ? 'bg-green-100 text-green-800' : ''}
                                  ${firstRecord.severity === 1 ? 'bg-yellow-100 text-yellow-800' : ''}
                                  ${firstRecord.severity === 2 ? 'bg-orange-100 text-orange-800' : ''}
                                  ${firstRecord.severity === 3 ? 'bg-red-100 text-red-800' : ''}
                                  ${firstRecord.severity === 4 ? 'bg-red-200 text-red-900' : ''}
                                `}>
                                  S{firstRecord.severity}
                                </span>

                                {sortedRecords.some(r => r.was_treated) && (
                                  <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium flex items-center gap-0.5">
                                    <Activity className="w-2.5 h-2.5" />
                                    Gydyta
                                  </span>
                                )}
                              </div>

                              {!isExpanded && uniqueProducts.length > 0 && (
                                <div className="text-[10px] text-gray-500 mt-0.5 ml-4 truncate">
                                  {uniqueProducts.length} produktas(-ai)
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                              {firstRecord.technician_name}
                            </div>
                          </div>
                        </div>

                        {isExpanded && productDetails.length > 0 && (
                          <div className="px-2 pb-2 ml-4 border-l-2 border-blue-200">
                            <div className="bg-gray-50 rounded p-2 space-y-1">
                              <div className="text-[10px] font-semibold text-gray-700 mb-1.5">
                                Naudoti produktai:
                              </div>
                              {productDetails.map((prod, idx) => (
                                <div key={idx} className="text-[10px] text-gray-600 flex items-center justify-between gap-2">
                                  <span className="font-medium">{prod.name}</span>
                                  <span className="text-gray-500">
                                    {prod.quantity ? `${prod.quantity} ${prod.unit || ''}` : '—'}
                                    {prod.batch ? ` (LOT ${prod.batch})` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
