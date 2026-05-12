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
  onZoneSelect: (zone: number, claw?: HoofClaw) => void;
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
      // Pass claw to onZoneSelect so parent can open modal immediately
      onClawSelect(claw);
      onZoneSelect(zone, claw);
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
          <div className="text-2xl font-bold text-gray-900">
            {currentHoof?.label}
          </div>
        </div>

        <div className="w-28"></div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-8">
        <svg className="zone-svg w-full max-w-4xl mx-auto" viewBox="0 0 420 470" xmlns="http://www.w3.org/2000/svg" aria-label="Hoof Zones Diagram">
          <defs>
            <linearGradient id="hoofBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9fa9b0"/>
              <stop offset="100%" stopColor="#7f8a91"/>
            </linearGradient>

            <linearGradient id="hoofBase2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#aab3b9"/>
              <stop offset="100%" stopColor="#8a959c"/>
            </linearGradient>

            <linearGradient id="hoofLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b5bdc3"/>
              <stop offset="100%" stopColor="#8c979e"/>
            </linearGradient>
          </defs>

          {/* Top shared heel zone 10 */}
          <ZonePath zone={10} claw="inner" keyStr="center-10" fill="url(#hoofBase2)"
            d="M184 82 C196 70, 224 70, 236 82 C230 95, 220 104, 210 108 C200 104, 190 95, 184 82 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "center-10"} />

          {/* LEFT CLAW OUTER SILHOUETTE / ZONE AREAS */}
          
          {/* LEFT ZONE 6 - top heel / bulb */}
          <ZonePath zone={6} claw="inner" keyStr="left-6" fill="url(#hoofBase2)"
            d="M130 86 C102 98, 84 125, 78 164 C100 158, 124 156, 149 160 C162 145, 175 125, 184 100 C168 87, 148 81, 130 86 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-6"} />

          {/* LEFT ZONE 3 - outer side region */}
          <ZonePath zone={3} claw="inner" keyStr="left-3" fill="url(#hoofBase2)"
            d="M78 164 C66 195, 65 231, 74 265 C83 269, 94 269, 105 266 C104 230, 108 193, 119 166 C104 159, 90 159, 78 164 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-3"} />

          {/* LEFT ZONE 4 - central sole */}
          <ZonePath zone={4} claw="inner" keyStr="left-4" fill="url(#hoofBase)"
            d="M119 166 C108 193, 104 230, 105 266 C122 281, 145 288, 170 286 C183 262, 190 232, 188 203 C186 184, 173 168, 149 160 C138 158, 128 160, 119 166 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-4"} />

          {/* LEFT ZONE 5 - lower inner/toe sole region */}
          <ZonePath zone={5} claw="inner" keyStr="left-5" fill="url(#hoofBase)"
            d="M105 266 C113 296, 126 326, 145 350 C158 347, 172 341, 184 330 C181 314, 176 298, 170 286 C145 288, 122 281, 105 266 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-5"} />

          {/* LEFT ZONE 2 - lower outer strip */}
          <ZonePath zone={2} claw="inner" keyStr="left-2" fill="url(#hoofBase2)"
            d="M74 265 C80 303, 99 343, 126 374 C132 371, 139 362, 145 350 C126 326, 113 296, 105 266 C94 269, 83 269, 74 265 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-2"} />

          {/* LEFT ZONE 1 - bottom toe tip */}
          <ZonePath zone={1} claw="inner" keyStr="left-1" fill="url(#hoofLight)"
            d="M126 374 C137 389, 151 402, 168 410 C178 389, 184 364, 184 330 C172 341, 158 347, 145 350 C139 362, 132 371, 126 374 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "left-1"} />

          {/* RIGHT CLAW */}
          
          {/* RIGHT ZONE 6 - top heel / bulb */}
          <ZonePath zone={6} claw="outer" keyStr="right-6" fill="url(#hoofBase2)"
            d="M290 86 C318 98, 336 125, 342 164 C320 158, 296 156, 271 160 C258 145, 245 125, 236 100 C252 87, 272 81, 290 86 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-6"} />

          {/* RIGHT ZONE 3 - outer side region */}
          <ZonePath zone={3} claw="outer" keyStr="right-3" fill="url(#hoofBase2)"
            d="M342 164 C354 195, 355 231, 346 265 C337 269, 326 269, 315 266 C316 230, 312 193, 301 166 C316 159, 330 159, 342 164 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-3"} />

          {/* RIGHT ZONE 4 - central sole */}
          <ZonePath zone={4} claw="outer" keyStr="right-4" fill="url(#hoofBase)"
            d="M301 166 C312 193, 316 230, 315 266 C298 281, 275 288, 250 286 C237 262, 230 232, 232 203 C234 184, 247 168, 271 160 C282 158, 292 160, 301 166 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-4"} />

          {/* RIGHT ZONE 5 - lower inner/toe sole region */}
          <ZonePath zone={5} claw="outer" keyStr="right-5" fill="url(#hoofBase)"
            d="M315 266 C307 296, 294 326, 275 350 C262 347, 248 341, 236 330 C239 314, 244 298, 250 286 C275 288, 298 281, 315 266 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-5"} />

          {/* RIGHT ZONE 2 - lower outer strip */}
          <ZonePath zone={2} claw="outer" keyStr="right-2" fill="url(#hoofBase2)"
            d="M346 265 C340 303, 321 343, 294 374 C288 371, 281 362, 275 350 C294 326, 307 296, 315 266 C326 269, 337 269, 346 265 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-2"} />

          {/* RIGHT ZONE 1 - bottom toe tip */}
          <ZonePath zone={1} claw="outer" keyStr="right-1" fill="url(#hoofLight)"
            d="M294 374 C283 389, 269 402, 252 410 C242 389, 236 364, 236 330 C248 341, 262 347, 275 350 C281 362, 288 371, 294 374 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "right-1"} />

          {/* CENTER ZONE 0 */}
          <ZonePath zone={0} claw="inner" keyStr="center-0" fill="#ffffff"
            d="M210 104 C202 130, 200 167, 202 212 C204 256, 206 302, 210 348 C214 302, 216 256, 218 212 C220 167, 218 130, 210 104 Z"
            onClick={handleZoneClick} selected={tempZoneKey === "center-0"} />

          {/* GUIDE LABELS AND LINES LIKE THE PRINTED CHART */}
          
          {/* zone 10 top label */}
          <text x="210" y="79" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="20" fill="#1f2e36">10</text>

          {/* zone 6 labels */}
          <text x="136" y="134" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="26" fill="#ffffff">6</text>
          <text x="284" y="134" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="26" fill="#ffffff">6</text>

          {/* zone 3 labels */}
          <text x="92" y="220" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="24" fill="#ffffff">3</text>
          <text x="328" y="220" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="24" fill="#ffffff">3</text>

          {/* zone 4 labels */}
          <text x="150" y="232" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="26" fill="#ffffff">4</text>
          <text x="270" y="232" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="26" fill="#ffffff">4</text>

          {/* zone 5 labels */}
          <text x="148" y="323" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="25" fill="#ffffff">5</text>
          <text x="272" y="323" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="25" fill="#ffffff">5</text>

          {/* zone 2 labels */}
          <text x="106" y="335" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="22" fill="#ffffff">2</text>
          <text x="314" y="335" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="22" fill="#ffffff">2</text>

          {/* zone 1 labels */}
          <text x="154" y="392" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="24" fill="#ffffff">1</text>
          <text x="266" y="392" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="24" fill="#ffffff">1</text>

          {/* zone 0 label */}
          <text x="210" y="226" textAnchor="middle" className="ztext pointer-events-none select-none" fontSize="24" fill="#1f2e36">0</text>

          {/* printed-chart style leader lines */}
          <path d="M194 84 C185 92, 176 104, 168 118" className="guide-line pointer-events-none" stroke="#2c3941" strokeWidth="1.5" fill="none"/>
          <path d="M226 84 C235 92, 244 104, 252 118" className="guide-line pointer-events-none" stroke="#2c3941" strokeWidth="1.5" fill="none"/>

          <path d="M78 168 C70 193, 70 225, 76 254" className="guide-line pointer-events-none" stroke="#2c3941" strokeWidth="1.5" fill="none"/>
          <path d="M342 168 C350 193, 350 225, 344 254" className="guide-line pointer-events-none" stroke="#2c3941" strokeWidth="1.5" fill="none"/>
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
