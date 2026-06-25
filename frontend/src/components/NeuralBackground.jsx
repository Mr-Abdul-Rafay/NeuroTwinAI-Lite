import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function BackgroundConstellation() {
  const pointsRef = useRef();
  const linesRef = useRef();
  const particleCount = 75;

  // Initialize random particle data
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < particleCount; i++) {
      data.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 5
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.001
        ),
      });
    }
    return data;
  }, []);

  // Update positions and construct lines between close particles
  useFrame(() => {
    const positions = new Float32Array(particleCount * 3);
    const lineCoords = [];

    // 1. Update particle positions
    particles.forEach((p, i) => {
      p.position.add(p.velocity);

      // Bounce boundaries
      if (Math.abs(p.position.x) > 4.5) p.velocity.x *= -1;
      if (Math.abs(p.position.y) > 4.5) p.velocity.y *= -1;
      if (Math.abs(p.position.z) > 2.5) p.velocity.z *= -1;

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
    });

    // 2. Find connections (euclidean distance threshold)
    const threshold = 1.35;
    for (let i = 0; i < particleCount; i++) {
      let connections = 0;
      for (let j = i + 1; j < particleCount; j++) {
        if (connections >= 2) break; // Limit connection density for performance
        const dist = particles[i].position.distanceTo(particles[j].position);
        if (dist < threshold) {
          lineCoords.push(particles[i].position.x, particles[i].position.y, particles[i].position.z);
          lineCoords.push(particles[j].position.x, particles[j].position.y, particles[j].position.z);
          connections++;
        }
      }
    }

    // 3. Update geometries
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.array.set(positions);
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (linesRef.current) {
      const lineArray = new Float32Array(lineCoords);
      linesRef.current.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(lineArray, 3)
      );
      linesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const initialPositions = useMemo(() => new Float32Array(particleCount * 3), []);

  return (
    <group>
      {/* Drifting Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[initialPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#46f1c5"
          size={0.06}
          sizeAttenuation={true}
          transparent
          opacity={0.3}
        />
      </points>

      {/* Constellation Lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#0063a9"
          transparent
          opacity={0.12}
          linewidth={1}
        />
      </lineSegments>
    </group>
  );
}

export default function NeuralBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ alpha: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <BackgroundConstellation />
      </Canvas>
    </div>
  );
}
