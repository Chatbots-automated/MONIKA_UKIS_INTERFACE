interface HoofZoneDiagramProps {
  selectedZone: number | null;
  onZoneSelect: (zone: number) => void;
  examinedZones: Set<string>;
}

export function HoofZoneDiagram({ selectedZone, onZoneSelect, examinedZones }: HoofZoneDiagramProps) {
  const getZoneColor = (zone: number) => {
    if (selectedZone === zone) return 'bg-blue-500 border-blue-700';
    if (examinedZones.has(`${zone}`)) return 'bg-orange-400 border-orange-600';
    return 'bg-green-100 hover:bg-green-200 border-green-300';
  };

  const zones = [
    // Top row
    { zone: 4, label: 'Soft inner', gridArea: 'a' },
    { zone: 6, label: 'Axial fissure', gridArea: 'b' },
    { zone: 7, label: 'Interdigital', gridArea: 'c' },
    
    // Middle row
    { zone: 3, label: 'Horizontal fissure', gridArea: 'd' },
    { zone: 0, label: 'Sole ulcer', gridArea: 'e' },
    { zone: 8, label: 'Toe ulcer', gridArea: 'f' },
    
    // Lower middle row
    { zone: 2, label: 'Toe ulcer', gridArea: 'g' },
    { zone: 5, label: 'Vertical fissure', gridArea: 'h' },
    { zone: 9, label: 'Digital dermatitis', gridArea: 'i' },
    
    // Bottom row
    { zone: 1, label: 'White line', gridArea: 'j' },
    { zone: 10, label: 'Heel erosion', gridArea: 'k' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Nago zonos (0-10)</h3>
        <p className="text-sm text-gray-600">Spauskite ant zonos norėdami įrašyti būklę</p>
      </div>

      {/* Grid layout matching hoof diagram */}
      <div 
        className="grid gap-2 p-4 bg-white rounded-lg shadow-lg border-2 border-gray-200"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: 'auto auto auto auto',
          gridTemplateAreas: `
            "a b c"
            "d e f"
            "g h i"
            "j . k"
          `
        }}
      >
        {zones.map(({ zone, label, gridArea }) => (
          <button
            key={zone}
            onClick={() => onZoneSelect(zone)}
            className={`
              relative p-6 rounded-lg border-2 transition-all duration-200
              transform hover:scale-105 hover:shadow-xl
              ${getZoneColor(zone)}
            `}
            style={{ gridArea }}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {zone}
              </div>
              <div className="text-xs font-medium text-gray-700 leading-tight">
                {label}
              </div>
            </div>
            
            {examinedZones.has(`${zone}`) && (
              <div className="absolute top-1 right-1">
                <div className="w-3 h-3 bg-orange-600 rounded-full animate-pulse"></div>
              </div>
            )}
            
            {selectedZone === zone && (
              <div className="absolute inset-0 border-4 border-blue-600 rounded-lg pointer-events-none animate-pulse"></div>
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
          <span>Nepatikrinta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400 border-2 border-orange-600 rounded"></div>
          <span>Įvesta būklė</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 border-2 border-blue-700 rounded"></div>
          <span>Pasirinkta</span>
        </div>
      </div>

      {/* Zone info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>Pagal veterinarinę nago diagramą:</strong>
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
          <div>• Zona 0: Padės centras</div>
          <div>• Zona 1-3: Baltoji linija</div>
          <div>• Zona 4-6: Vidinis nagas</div>
          <div>• Zona 7-10: Išorinis nagas</div>
        </div>
      </div>
    </div>
  );
}
