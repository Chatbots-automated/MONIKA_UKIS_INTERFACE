import { useState, useEffect } from 'react';
import { HoofLeg, HoofClaw } from '../lib/types';
import { supabase } from '../lib/supabase';
import { Clock, Activity } from 'lucide-react';

interface HoofInterfaceNewProps {
  selectedLeg: HoofLeg | null;
  selectedClaw: HoofClaw | null;
  selectedZone: number | null;
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

interface HoofData {
  id: number;
  label: string;
  short: string;
  leg: HoofLeg;
  position: string;
  side: string;
}

const HOOFS: HoofData[] = [
  { id: 1, label: "Priekinė Kairė", short: "FL", leg: "FL", side: "kairė", position: "priekinė" },
  { id: 2, label: "Priekinė Dešinė", short: "FR", leg: "FR", side: "dešinė", position: "priekinė" },
  { id: 3, label: "Galinė Kairė", short: "HL", leg: "HL", side: "kairė", position: "galinė" },
  { id: 4, label: "Galinė Dešinė", short: "HR", leg: "HR", side: "dešinė", position: "galinė" }
];

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
  onLegSelect,
  onClawSelect,
  onZoneSelect,
  examinedZones,
  animalId
}: HoofInterfaceNewProps) {
  const [screen, setScreen] = useState<'legs' | 'zones'>('legs');
  const [tempZoneKey, setTempZoneKey] = useState<string | null>(null);
  const [history, setHistory] = useState<HoofHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const currentHoof = HOOFS.find(h => h.leg === selectedLeg);

  // Reset screen to 'legs' when parent resets selectedLeg (after saving examination)
  useEffect(() => {
    if (!selectedLeg) {
      setScreen('legs');
      setTempZoneKey(null);
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
    // Auto-advance to zones screen
    setScreen('zones');
  };

  const handleZoneClick = (zone: number, claw: HoofClaw, key: string) => {
    if (tempZoneKey === key) {
      setTempZoneKey(null);
      onZoneSelect(-1); // Deselect
      onClawSelect('inner'); // Reset
    } else {
      setTempZoneKey(key);
      onZoneSelect(zone);
      onClawSelect(claw);
    }
  };

  const handleBack = () => {
    setScreen('legs');
    setTempZoneKey(null);
  };

  const getClawText = (claw: HoofClaw | null) => {
    if (claw === 'inner') return 'Kairysis nagas';
    if (claw === 'outer') return 'Dešinysis nagas';
    return 'Centras';
  };

  const HoofSVG = ({ num, active }: { num: number; active: boolean }) => {
    const fill = active ? "url(#cardFillSel)" : "url(#cardFill)";
    const stroke = active ? "#1f5670" : "#2f3d47";
    const line = active ? "#1f5670" : "#8a949b";
    const numCol = active ? "#1f5670" : "#5a7280";

    return (
      <svg className="w-full max-w-[200px] filter drop-shadow-sm transition-transform duration-250" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cardFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6ebee"/>
            <stop offset="100%" stopColor="#c2cbd1"/>
          </linearGradient>
          <linearGradient id="cardFillSel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfe6ef"/>
            <stop offset="100%" stopColor="#90bdce"/>
          </linearGradient>
        </defs>

        <path d="M 100 22 C 86 22, 70 28, 56 42 C 40 60, 32 88, 32 116 C 32 144, 40 172, 56 192 C 68 204, 82 210, 96 208 C 100 200, 102 188, 102 168 C 102 130, 100 92, 100 56 C 100 40, 100 28, 100 22 Z"
          fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />

        <path d="M 100 22 C 114 22, 130 28, 144 42 C 160 60, 168 88, 168 116 C 168 144, 160 172, 144 192 C 132 204, 118 210, 104 208 C 100 200, 98 188, 98 168 C 98 130, 100 92, 100 56 C 100 40, 100 28, 100 22 Z"
          fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />

        <path d="M 100 30 C 99 60, 99 100, 99 140 C 99 170, 100 190, 100 205"
          fill="none" stroke={line} strokeWidth="1.5" opacity=".7"/>

        <path d="M 56 50 C 76 38, 124 38, 144 50" fill="none" stroke={line} strokeWidth="1.4" opacity=".55"/>
        <path d="M 38 110 C 56 100, 76 100, 92 110" fill="none" stroke={line} strokeWidth="1.2" opacity=".4"/>
        <path d="M 162 110 C 144 100, 124 100, 108 110" fill="none" stroke={line} strokeWidth="1.2" opacity=".4"/>
        <path d="M 60 188 C 76 180, 92 178, 96 178" fill="none" stroke={line} strokeWidth="1.2" opacity=".4"/>
        <path d="M 140 188 C 124 180, 108 178, 104 178" fill="none" stroke={line} strokeWidth="1.2" opacity=".4"/>

        <text x="100" y="14" textAnchor="middle"
              fontFamily="'IBM Plex Mono', monospace" fontSize="13" fontWeight="600" letterSpacing="2"
              fill={numCol}>0{num}</text>
      </svg>
    );
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

        <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
          {HOOFS.map((hoof) => {
            const isSelected = selectedLeg === hoof.leg;
            return (
              <button
                key={hoof.id}
                type="button"
                onClick={() => handleHoofClick(hoof.leg)}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl
                  border-2 transition-all duration-200
                  ${isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-200'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }
                `}
              >
                <HoofSVG num={hoof.id} active={isSelected} />
                <div className="text-center">
                  <div className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {hoof.label}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-gray-500 font-mono">
                    {hoof.position} · {hoof.side}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    );
  }

  // Screen 2: Zones
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-sm font-medium"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Grįžti
        </button>

        <div className="text-center">
          <div className="text-sm font-semibold uppercase tracking-wider text-gray-600">
            2 žingsnis iš 2 · Pasirinkite zoną
          </div>
          <div className="text-lg font-bold text-gray-900">
            {currentHoof?.label}
          </div>
        </div>

        <div className="w-20"></div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <svg className="w-full max-w-xl mx-auto" viewBox="0 0 420 470" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hoofBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9fa9b0"/>
              <stop offset="100%" stopColor="#7f8a91"/>
            </linearGradient>
            <linearGradient id="hoofBase2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#aab3b9"/>
              <stop offset="100%" stopColor="#8a959c"/>
            </linearGradient>
          </defs>

          {/* Guide text */}
          <text x="166" y="70" className="pointer-events-none select-none fill-gray-800" fontSize="22" fontWeight="600">1</text>
          <text x="248" y="70" className="pointer-events-none select-none fill-gray-800" fontSize="22" fontWeight="600">1</text>
          <text x="79" y="112" className="pointer-events-none select-none fill-gray-800" fontSize="22" fontWeight="600">2</text>
          <text x="338" y="112" className="pointer-events-none select-none fill-gray-800" fontSize="22" fontWeight="600">2</text>

          {/* Guide lines */}
          <path d="M168 75 L168 90" className="pointer-events-none" stroke="#2f3c44" strokeWidth="1.25" fill="none" opacity="0.95"/>
          <path d="M250 75 L250 90" className="pointer-events-none" stroke="#2f3c44" strokeWidth="1.25" fill="none" opacity="0.95"/>
          <path d="M90 114 L112 114 L121 130" className="pointer-events-none" stroke="#2f3c44" strokeWidth="1.25" fill="none" opacity="0.95"/>
          <path d="M330 114 L308 114 L299 130" className="pointer-events-none" stroke="#2f3c44" strokeWidth="1.25" fill="none" opacity="0.95"/>

          {/* LEFT CLAW ZONES */}
          <ZonePath zone={1} claw="inner" keyStr="left-1" fill="url(#hoofBase2)"
            d="M138 90 C149 88, 159 91, 167 100 C171 110, 171 122, 168 136 C152 134, 136 135, 120 140 C122 118, 128 101, 138 90 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-1"} />

          <ZonePath zone={2} claw="inner" keyStr="left-2" fill="url(#hoofBase2)"
            d="M86 132 C74 163, 71 204, 75 246 C76 258, 78 270, 82 281 C90 282, 99 281, 108 278 C107 237, 109 194, 118 157 C109 145, 99 136, 86 132 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-2"} />

          <ZonePath zone={5} claw="inner" keyStr="left-5" fill="url(#hoofBase)"
            d="M120 140 C136 135, 152 134, 168 136 C175 145, 178 156, 179 168 C171 168, 161 170, 151 176 C139 171, 128 168, 118 157 C118 151, 119 145, 120 140 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-5"} />

          <ZonePath zone={4} claw="inner" keyStr="left-4" fill="url(#hoofBase)"
            d="M118 157 C109 194, 107 237, 108 278 C126 289, 148 293, 172 289 C183 265, 186 232, 182 201 C179 188, 172 180, 151 176 C139 171, 128 168, 118 157 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-4"} />

          <ZonePath zone={3} claw="inner" keyStr="left-3" fill="url(#hoofBase2)"
            d="M82 281 C89 315, 106 347, 132 373 C139 379, 145 384, 151 388 C149 359, 144 329, 135 301 C125 295, 116 287, 108 278 C99 281, 90 282, 82 281 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-3"} />

          <ZonePath zone={6} claw="inner" keyStr="left-6" fill="url(#hoofBase2)"
            d="M135 301 C144 329, 149 359, 151 388 C160 393, 170 394, 180 391 C184 367, 182 334, 172 289 C159 293, 146 295, 135 301 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-6"} />

          {/* RIGHT CLAW ZONES */}
          <ZonePath zone={1} claw="outer" keyStr="right-1" fill="url(#hoofBase2)"
            d="M282 90 C271 88, 261 91, 253 100 C249 110, 249 122, 252 136 C268 134, 284 135, 300 140 C298 118, 292 101, 282 90 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-1"} />

          <ZonePath zone={2} claw="outer" keyStr="right-2" fill="url(#hoofBase2)"
            d="M334 132 C346 163, 349 204, 345 246 C344 258, 342 270, 338 281 C330 282, 321 281, 312 278 C313 237, 311 194, 302 157 C311 145, 321 136, 334 132 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-2"} />

          <ZonePath zone={5} claw="outer" keyStr="right-5" fill="url(#hoofBase)"
            d="M300 140 C284 135, 268 134, 252 136 C245 145, 242 156, 241 168 C249 168, 259 170, 269 176 C281 171, 292 168, 302 157 C302 151, 301 145, 300 140 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-5"} />

          <ZonePath zone={4} claw="outer" keyStr="right-4" fill="url(#hoofBase)"
            d="M302 157 C311 194, 313 237, 312 278 C294 289, 272 293, 248 289 C237 265, 234 232, 238 201 C241 188, 248 180, 269 176 C281 171, 292 168, 302 157 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-4"} />

          <ZonePath zone={3} claw="outer" keyStr="right-3" fill="url(#hoofBase2)"
            d="M338 281 C331 315, 314 347, 288 373 C281 379, 275 384, 269 388 C271 359, 276 329, 285 301 C295 295, 304 287, 312 278 C321 281, 330 282, 338 281 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-3"} />

          <ZonePath zone={6} claw="outer" keyStr="right-6" fill="url(#hoofBase2)"
            d="M285 301 C276 329, 271 359, 269 388 C260 393, 250 394, 240 391 C236 367, 238 334, 248 289 C261 293, 274 295, 285 301 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-6"} />

          {/* CENTER ZONES */}
          <ZonePath zone={0} claw="inner" keyStr="center-0" fill="#ffffff"
            d="M210 93 C203 117, 200 151, 202 193 C204 235, 206 277, 210 320 C214 277, 216 235, 218 193 C220 151, 217 117, 210 93 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "center-0"} />

          <ZonePath zone={10} claw="inner" keyStr="center-10" fill="url(#hoofBase2)"
            d="M180 391 C192 404, 205 411, 210 413 C215 411, 228 404, 240 391 C226 399, 194 399, 180 391 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "center-10"} />

          {/* Zone labels */}
          <text x="145" y="121" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="24" fontWeight="700">1</text>
          <text x="102" y="206" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="24" fontWeight="700">2</text>
          <text x="146" y="163" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="25" fontWeight="700">5</text>
          <text x="150" y="236" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="26" fontWeight="700">4</text>
          <text x="119" y="336" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="24" fontWeight="700">3</text>
          <text x="164" y="348" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="26" fontWeight="700">6</text>

          <text x="275" y="121" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="24" fontWeight="700">1</text>
          <text x="318" y="206" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="24" fontWeight="700">2</text>
          <text x="274" y="163" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="25" fontWeight="700">5</text>
          <text x="270" y="236" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="26" fontWeight="700">4</text>
          <text x="301" y="336" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="24" fontWeight="700">3</text>
          <text x="256" y="348" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="26" fontWeight="700">6</text>

          <text x="210" y="223" textAnchor="middle" className="pointer-events-none select-none fill-gray-800" fontSize="24" fontWeight="700">0</text>
          <text x="210" y="414" textAnchor="middle" className="pointer-events-none select-none fill-white" fontSize="18" fontWeight="700">10</text>
        </svg>
      </div>

      {/* Selection Info */}
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-1">Nagas</div>
            <div className="font-semibold">{currentHoof?.label}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-1">Zona</div>
            {selectedZone !== null && selectedZone !== -1 ? (
              <span className="inline-block px-2 py-1 bg-blue-600 text-white rounded text-xs font-mono font-semibold">
                Z{selectedZone}
              </span>
            ) : (
              <span className="text-gray-400 text-xs">—</span>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-1">Regionas</div>
            {selectedZone !== null && selectedZone !== -1 ? (
              <div className="text-xs font-medium text-gray-700">
                {ZONE_NAMES[selectedZone]} · {getClawText(selectedClaw)}
              </div>
            ) : (
              <span className="text-gray-400 text-xs">Paspauskite zoną</span>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 font-mono text-center p-3 bg-gray-50 border border-gray-200 rounded">
        Paspauskite zoną, kad įrašytumėte pažeidimo vietą. Visos nago zonos yra paspaudžiamos.
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

interface ZonePathProps {
  zone: number;
  claw: HoofClaw;
  keyStr: string;
  d: string;
  fill: string;
  onClick: (zone: number, claw: HoofClaw, key: string) => void;
  selected: boolean;
}

function ZonePath({ zone, claw, keyStr, d, fill, onClick, selected }: ZonePathProps) {
  return (
    <path
      d={d}
      fill={selected ? "#3d84a8" : fill}
      stroke={selected ? "#193949" : "#2c3941"}
      strokeWidth="1.5"
      className="cursor-pointer transition-all duration-150 hover:opacity-80"
      onClick={() => onClick(zone, claw, keyStr)}
    />
  );
}
