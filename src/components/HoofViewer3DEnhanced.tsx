import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CowModel3D } from './CowModel3D';
import { HoofZoneDiagram } from './HoofZoneDiagram';

interface HoofViewer3DEnhancedProps {
  selectedLeg: string | null;
  selectedClaw: 'inner' | 'outer' | null;
  selectedZone: number | null;
  onLegSelect: (leg: 'FL' | 'FR' | 'HL' | 'HR') => void;
  onClawSelect: (claw: 'inner' | 'outer') => void;
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
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && (hovered || isSelected)) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.05, 1.05, 1.05), 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  const baseColor = ZONE_COLORS[zone as keyof typeof ZONE_COLORS] || '#cccccc';
  const color = isSelected ? '#2196f3' : hovered ? '#ffeb3b' : isExamined ? '#ff9800' : baseColor;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
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

function HoofZones({ 
  selectedZone, 
  onZoneSelect, 
  examinedZones, 
  claw 
}: { 
  selectedZone: number | null; 
  onZoneSelect: (zone: number) => void;
  examinedZones: Set<string>;
  claw: 'inner' | 'outer';
}) {
  // Based on the veterinary hoof chart image
  const zoneLayout = [
    // Top row
    { zone: 4, position: [-1.3, 1.5, 0], size: [1, 0.7, 0.3] },
    { zone: 6, position: [0, 1.5, 0], size: [1, 0.7, 0.3] },
    { zone: 7, position: [1.3, 1.5, 0], size: [0.9, 0.7, 0.3] },
    
    // Middle row
    { zone: 3, position: [-1.3, 0.5, 0], size: [1, 0.9, 0.3] },
    { zone: 0, position: [0, 0.5, 0], size: [1, 0.9, 0.3] },      // Center sole
    { zone: 8, position: [1.3, 0.5, 0], size: [0.9, 0.9, 0.3] },
    
    // Lower middle row
    { zone: 2, position: [-1.3, -0.5, 0], size: [1, 0.9, 0.3] },
    { zone: 5, position: [0, -0.5, 0], size: [1, 0.9, 0.3] },
    { zone: 9, position: [1.3, -0.5, 0], size: [0.9, 0.9, 0.3] },
    
    // Bottom row
    { zone: 1, position: [-1.3, -1.5, 0], size: [1, 0.7, 0.3] },
    { zone: 10, position: [1.3, -1.5, 0], size: [0.9, 0.7, 0.3] },
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

interface ClawSelectorProps {
  onClawSelect: (claw: 'inner' | 'outer') => void;
  selectedClaw: 'inner' | 'outer' | null;
  leg: string;
}

function ClawSelector({ onClawSelect, selectedClaw, leg }: ClawSelectorProps) {
  const [hoveredClaw, setHoveredClaw] = useState<'inner' | 'outer' | null>(null);

  return (
    <group>
      {/* Title */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
      >
        {leg} - Pasirinkite nagą
      </Text>

      {/* Inner Claw */}
      <mesh
        position={[-1, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClawSelect('inner');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredClaw('inner');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredClaw(null);
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[1.2, 1.8, 0.6]} />
        <meshStandardMaterial 
          color={selectedClaw === 'inner' ? '#3b82f6' : hoveredClaw === 'inner' ? '#60a5fa' : '#8b4513'}
          emissive={selectedClaw === 'inner' || hoveredClaw === 'inner' ? '#3b82f6' : '#000000'}
          emissiveIntensity={selectedClaw === 'inner' || hoveredClaw === 'inner' ? 0.3 : 0}
        />
      </mesh>
      <Text
        position={[-1, -1.2, 0]}
        fontSize={0.3}
        color={selectedClaw === 'inner' ? '#3b82f6' : 'white'}
        anchorX="center"
        anchorY="middle"
      >
        Vidinis
      </Text>

      {/* Outer Claw */}
      <mesh
        position={[1, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClawSelect('outer');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredClaw('outer');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredClaw(null);
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[1.2, 1.8, 0.6]} />
        <meshStandardMaterial 
          color={selectedClaw === 'outer' ? '#3b82f6' : hoveredClaw === 'outer' ? '#60a5fa' : '#8b4513'}
          emissive={selectedClaw === 'outer' || hoveredClaw === 'outer' ? '#3b82f6' : '#000000'}
          emissiveIntensity={selectedClaw === 'outer' || hoveredClaw === 'outer' ? 0.3 : 0}
        />
      </mesh>
      <Text
        position={[1, -1.2, 0]}
        fontSize={0.3}
        color={selectedClaw === 'outer' ? '#3b82f6' : 'white'}
        anchorX="center"
        anchorY="middle"
      >
        Išorinis
      </Text>
    </group>
  );
}

function CameraController({ stage }: { stage: 'cow' | 'claw' | 'zone' }) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    switch (stage) {
      case 'cow':
        targetPosition.current.set(0, 3, 10);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'claw':
        targetPosition.current.set(0, 0, 6);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'zone':
        targetPosition.current.set(0, 0, 8);
        targetLookAt.current.set(0, 0, 0);
        break;
    }
  }, [stage]);

  useFrame(() => {
    camera.position.lerp(targetPosition.current, 0.05);
    
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.multiplyScalar(-10).add(camera.position);
    currentLookAt.lerp(targetLookAt.current, 0.05);
    
    camera.lookAt(currentLookAt);
  });

  return null;
}

export function HoofViewer3DEnhanced({ 
  selectedLeg, 
  selectedClaw, 
  selectedZone, 
  onLegSelect,
  onClawSelect,
  onZoneSelect,
  examinedZones = new Set()
}: HoofViewer3DEnhancedProps) {
  // Determine current stage
  const stage = !selectedLeg ? 'cow' : !selectedClaw ? 'claw' : 'zone';

  console.log('HoofViewer3DEnhanced rendering, stage:', stage);

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg relative">
      {stage !== 'zone' && (
        <div className="h-[600px]">
          <Canvas>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} />
            
            {stage === 'cow' && (
              <CowModel3D 
                onLegSelect={onLegSelect}
                selectedLeg={selectedLeg}
              />
            )}

            {stage === 'claw' && selectedLeg && (
              <ClawSelector 
                onClawSelect={onClawSelect}
                selectedClaw={selectedClaw}
                leg={selectedLeg}
              />
            )}
            
            <OrbitControls />
          </Canvas>
        </div>
      )}

      {stage === 'zone' && selectedLeg && selectedClaw && (
        <div className="p-6">
          <HoofZoneDiagram
            selectedZone={selectedZone}
            onZoneSelect={onZoneSelect}
            examinedZones={examinedZones}
          />
        </div>
      )}
      
      {stage !== 'zone' && (
        <>
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md">
            <p className="text-xs text-gray-600 font-medium mb-2">
              {stage === 'cow' && '🐄 1. Pasirinkite koją'}
              {stage === 'claw' && '🦶 2. Pasirinkite nagą'}
            </p>
            <p className="text-xs text-gray-500">Vilkite: Sukti</p>
            <p className="text-xs text-gray-500">Ratukas: Artinti</p>
            <p className="text-xs text-gray-500">Spauskite ant objekto</p>
          </div>

          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md">
            {selectedLeg && (
              <p className="text-sm font-semibold text-gray-800">
                Koja: {selectedLeg}
              </p>
            )}
            {selectedClaw && (
              <p className="text-xs text-blue-600 mt-1">
                Nagas: {selectedClaw === 'inner' ? 'Vidinis' : 'Išorinis'}
              </p>
            )}
          </div>

          {selectedLeg && (
            <button
              onClick={() => {
                if (selectedClaw) {
                  onClawSelect(selectedClaw);
                } else {
                  onLegSelect(selectedLeg as any);
                }
              }}
              className="absolute top-4 left-4 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-md"
            >
              ← Grįžti
            </button>
          )}
        </>
      )}

      {stage === 'zone' && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              onClawSelect(selectedClaw!);
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-md"
          >
            ← Grįžti prie nago pasirinkimo
          </button>
        </div>
      )}
    </div>
  );
}
