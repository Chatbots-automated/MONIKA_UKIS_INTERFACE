import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState } from 'react';
import * as THREE from 'three';

interface HoofViewer3DProps {
  selectedLeg: string | null;
  selectedClaw: 'inner' | 'outer' | null;
  selectedZone: number | null;
  onZoneSelect: (zone: number) => void;
  examinedZones?: Set<string>;
}

const ZONE_COLORS = {
  0: '#e8f5e9',
  1: '#c8e6c9',
  2: '#a5d6a7',
  3: '#81c784',
  4: '#66bb6a',
  5: '#4caf50',
  6: '#43a047',
  7: '#388e3c',
  8: '#2e7d32',
  9: '#1b5e20',
  10: '#0d4f1c'
};

interface ZoneMeshProps {
  zone: number;
  position: [number, number, number];
  size: [number, number, number];
  isSelected: boolean;
  isExamined: boolean;
  onClick: () => void;
}

function ZoneMesh({ zone, position, size, isSelected, isExamined, onClick }: ZoneMeshProps) {
  const [hovered, setHovered] = useState(false);
  
  const baseColor = ZONE_COLORS[zone as keyof typeof ZONE_COLORS] || '#cccccc';
  const color = isSelected 
    ? '#2196f3' 
    : hovered 
    ? '#ffeb3b' 
    : isExamined 
    ? '#ff9800' 
    : baseColor;

  return (
    <group>
      <mesh
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color={color} 
          opacity={isSelected || hovered ? 0.9 : 0.7}
          transparent
        />
      </mesh>
      <Text
        position={[position[0], position[1], position[2] + size[2] / 2 + 0.1]}
        fontSize={0.3}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {zone}
      </Text>
    </group>
  );
}

function HoofModel({ selectedZone, onZoneSelect, examinedZones, claw }: { 
  selectedZone: number | null; 
  onZoneSelect: (zone: number) => void;
  examinedZones: Set<string>;
  claw: 'inner' | 'outer';
}) {
  const zoneLayout = [
    { zone: 4, position: [-1.5, 1, 0], size: [1.2, 0.8, 0.3] },
    { zone: 6, position: [0, 1, 0], size: [1.2, 0.8, 0.3] },
    { zone: 3, position: [-1.5, 0, 0], size: [1.2, 1, 0.3] },
    { zone: 0, position: [0, 0, 0], size: [1.2, 1, 0.3] },
    { zone: 5, position: [0, -1, 0], size: [1.2, 1, 0.3] },
    { zone: 2, position: [-1.5, -1, 0], size: [1.2, 1, 0.3] },
    { zone: 1, position: [-1.5, -2, 0], size: [1.2, 0.8, 0.3] },
    { zone: 7, position: [1.5, 1, 0], size: [1, 0.8, 0.3] },
    { zone: 8, position: [1.5, 0, 0], size: [1, 1, 0.3] },
    { zone: 9, position: [1.5, -1, 0], size: [1, 1, 0.3] },
    { zone: 10, position: [1.5, -2, 0], size: [1, 0.8, 0.3] },
  ];

  return (
    <group>
      {zoneLayout.map(({ zone, position, size }) => (
        <ZoneMesh
          key={zone}
          zone={zone}
          position={position as [number, number, number]}
          size={size as [number, number, number]}
          isSelected={selectedZone === zone}
          isExamined={examinedZones.has(`${zone}`)}
          onClick={() => onZoneSelect(zone)}
        />
      ))}
      
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.4}
        color="navy"
        anchorX="center"
        anchorY="middle"
      >
        {claw === 'inner' ? 'Vidinis nagas' : 'Išorinis nagas'}
      </Text>
    </group>
  );
}

export function HoofViewer3D({ 
  selectedLeg, 
  selectedClaw, 
  selectedZone, 
  onZoneSelect,
  examinedZones = new Set()
}: HoofViewer3DProps) {
  if (!selectedLeg || !selectedClaw) {
    return (
      <div className="w-full h-[500px] bg-gradient-to-br from-slate-100 to-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
        <div className="text-center p-8">
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Pasirinkite koją ir nagą
          </p>
          <p className="text-sm text-gray-500">
            3D modelis bus rodomas po pasirinkimo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        
        <HoofModel 
          selectedZone={selectedZone}
          onZoneSelect={onZoneSelect}
          examinedZones={examinedZones}
          claw={selectedClaw}
        />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          minDistance={5}
          maxDistance={15}
        />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md">
        <p className="text-xs text-gray-600 font-medium mb-2">Zona nuo 0 iki 10</p>
        <p className="text-xs text-gray-500">Pasukite: Vilkite pele</p>
        <p className="text-xs text-gray-500">Artinimas: Ratukas</p>
        <p className="text-xs text-gray-500">Spauskite ant zonos</p>
      </div>

      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md">
        <p className="text-sm font-semibold text-gray-800">
          {selectedLeg} - {selectedClaw === 'inner' ? 'Vidinis' : 'Išorinis'}
        </p>
        {selectedZone !== null && (
          <p className="text-xs text-blue-600 mt-1">
            Pasirinkta zona: {selectedZone}
          </p>
        )}
      </div>
    </div>
  );
}
