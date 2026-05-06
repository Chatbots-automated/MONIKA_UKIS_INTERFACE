import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface CowModel3DProps {
  onLegSelect: (leg: 'FL' | 'FR' | 'HL' | 'HR') => void;
  selectedLeg: string | null;
}

interface LegProps {
  position: [number, number, number];
  label: 'FL' | 'FR' | 'HL' | 'HR';
  isSelected: boolean;
  onSelect: () => void;
}

function Leg({ position, label, isSelected, onSelect }: LegProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && (hovered || isSelected)) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(1.1, 1.1, 1.1),
        0.1
      );
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(1, 1, 1),
        0.1
      );
    }
  });

  const color = isSelected 
    ? '#3b82f6' 
    : hovered 
    ? '#60a5fa' 
    : '#8b4513';

  return (
    <group position={position}>
      {/* Upper leg */}
      <mesh
        ref={meshRef}
        position={[0, -0.5, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
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
        <cylinderGeometry args={[0.25, 0.25, 1.5, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={hovered || isSelected ? color : '#000000'}
          emissiveIntensity={hovered || isSelected ? 0.3 : 0}
        />
      </mesh>
      
      {/* Hoof */}
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[0.35, 0.3, 0.5]} />
        <meshStandardMaterial color="#2c1810" />
      </mesh>

      {/* Label */}
      <Text
        position={[0, -2, 0]}
        fontSize={0.25}
        color={isSelected ? '#3b82f6' : hovered ? '#60a5fa' : 'white'}
        anchorX="center"
        anchorY="top"
      >
        {label}
      </Text>
    </group>
  );
}

export function CowModel3D({ onLegSelect, selectedLeg }: CowModel3DProps) {
  return (
    <group position={[0, 0, 0]} rotation={[0, Math.PI * 0.15, 0]}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1.2, 3.5]} />
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.8}
        />
      </mesh>

      {/* Body spots (Holstein pattern) */}
      <mesh position={[0.6, 0.8, 0.5]}>
        <boxGeometry args={[0.6, 0.4, 0.8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.5, 0.6, -0.8]}>
        <boxGeometry args={[0.7, 0.5, 1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.3, 0.4, 1.2]}>
        <boxGeometry args={[0.5, 0.4, 0.6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.8, 2.3]}>
        <boxGeometry args={[0.9, 0.9, 1.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Snout */}
      <mesh position={[0, 0.5, 3.1]}>
        <boxGeometry args={[0.7, 0.5, 0.4]} />
        <meshStandardMaterial color="#ffc0cb" />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.5, 1.3, 2.3]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.15, 0.4, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.5, 1.3, 2.3]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.15, 0.4, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Horns */}
      <mesh position={[-0.35, 1.5, 2.2]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.05, 0.08, 0.4, 8]} />
        <meshStandardMaterial color="#e8dcc0" />
      </mesh>
      <mesh position={[0.35, 1.5, 2.2]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.05, 0.08, 0.4, 8]} />
        <meshStandardMaterial color="#e8dcc0" />
      </mesh>

      {/* Tail */}
      <mesh position={[0, 0.5, -1.8]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[0, -0.1, -2.5]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Udder (under body) */}
      <mesh position={[0, -0.3, -0.3]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#ffc0cb" />
      </mesh>

      {/* Hind Left Leg - render first so it's behind */}
      <Leg
        position={[-0.7, -0.6, -1.2]}
        label="HL"
        isSelected={selectedLeg === 'HL'}
        onSelect={() => onLegSelect('HL')}
      />

      {/* Hind Right Leg - render first so it's behind */}
      <Leg
        position={[0.7, -0.6, -1.2]}
        label="HR"
        isSelected={selectedLeg === 'HR'}
        onSelect={() => onLegSelect('HR')}
      />

      {/* Front Left Leg */}
      <Leg
        position={[-0.7, -0.6, 1.2]}
        label="FL"
        isSelected={selectedLeg === 'FL'}
        onSelect={() => onLegSelect('FL')}
      />

      {/* Front Right Leg */}
      <Leg
        position={[0.7, -0.6, 1.2]}
        label="FR"
        isSelected={selectedLeg === 'FR'}
        onSelect={() => onLegSelect('FR')}
      />

      {/* Title */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.4}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
      >
        Pasirinkite koją
      </Text>

      {/* Instruction */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.2}
        color="#666666"
        anchorX="center"
        anchorY="middle"
      >
        Spauskite ant kojos
      </Text>
    </group>
  );
}
