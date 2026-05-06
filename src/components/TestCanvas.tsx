import { Canvas } from '@react-three/fiber';

export function TestCanvas() {
  return (
    <div style={{ width: '100%', height: '600px', backgroundColor: '#e0e0e0', border: '3px solid red' }}>
      <p>Canvas container (should see red border)</p>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
      </Canvas>
    </div>
  );
}
