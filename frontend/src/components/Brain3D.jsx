import React, { useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import brainGraphic from '../assets/brain_graphic.jpg';

function HologramBrain() {
  const groupRef = useRef();
  const planeRef = useRef();
  const particlesRef = useRef();
  
  // Load the exact brain graphic image
  const texture = useTexture(brainGraphic);
  
  const particleCount = 110;

  // Initialize random particle data orbiting the brain
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.25 + Math.random() * 0.45;
      const speed = 0.3 + Math.random() * 0.9;
      const y = (Math.random() - 0.5) * 1.9;
      const phase = Math.random() * 100;
      temp.push({ angle, radius, speed, y, phase });
    }
    return temp;
  }, []);

  const initialPositions = useMemo(() => new Float32Array(particleCount * 3), []);

  // Set up 3D pulsing hubs to add parallax depth
  const hubs = useMemo(() => [
    { pos: new THREE.Vector3(-0.4, 0.45, 0.22), delay: 0 },
    { pos: new THREE.Vector3(0.4, 0.4, 0.25), delay: 0.5 },
    { pos: new THREE.Vector3(-0.45, 0.0, 0.2), delay: 1.0 },
    { pos: new THREE.Vector3(0.35, -0.1, 0.25), delay: 1.5 },
    { pos: new THREE.Vector3(0.0, -0.4, 0.15), delay: 2.0 },
    { pos: new THREE.Vector3(-0.25, 0.1, -0.2), delay: 2.5 },
    { pos: new THREE.Vector3(0.2, 0.25, -0.22), delay: 3.0 }
  ], []);

  // Update positions for particles and overall rotation
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    
    // Rotate entire brain setup
    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.15;
      groupRef.current.rotation.x = Math.sin(elapsed * 0.08) * 0.06;
      
      const scale = 1.0 + Math.sin(elapsed * 1.5) * 0.012;
      groupRef.current.scale.set(scale, scale, scale);
    }

    // Animate swirling orbital particles
    const positions = new Float32Array(particleCount * 3);
    particles.forEach((p, i) => {
      const currentAngle = p.angle + elapsed * p.speed * 0.22;
      positions[i * 3] = Math.cos(currentAngle) * p.radius;
      positions[i * 3 + 1] = p.y + Math.sin(elapsed + p.phase) * 0.04;
      positions[i * 3 + 2] = Math.sin(currentAngle) * p.radius;
    });

    if (particlesRef.current) {
      particlesRef.current.geometry.attributes.position.array.set(positions);
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── Swirling Glowing Neural Particles ── */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[initialPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#46f1c5"
          size={0.038}
          sizeAttenuation={true}
          transparent
          opacity={0.7}
        />
      </points>

      {/* ── Glowing Hub Nodes (Provides Parallax Depth relative to the plane) ── */}
      {hubs.map((hub, index) => (
        <HubNode key={index} position={hub.pos} delay={hub.delay} />
      ))}
    </group>
  );
}

function HubNode({ position, delay }) {
  const meshRef = useRef();

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime() + delay;
    const pulse = 1.0 + Math.sin(elapsed * 2.5) * 0.22;
    if (meshRef.current) {
      meshRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.05, 16, 16]}>
        <meshBasicMaterial color="#46f1c5" transparent opacity={0.8} />
      </Sphere>
      <Sphere args={[0.11, 8, 8]}>
        <meshBasicMaterial color="#46f1c5" transparent opacity={0.12} />
      </Sphere>
    </group>
  );
}

function BrainCanvas() {
  return (
    <div style={{
      width: '280px',
      height: '280px',
      position: 'relative',
      cursor: 'grab',
    }}>
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#46f1c5" />
        <pointLight position={[-5, -5, -5]} intensity={0.6} color="#0063a9" />

        <Suspense fallback={null}>
          <HologramBrain />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={true}
          rotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div style={{
      width: '280px',
      height: '280px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="spinner" />
    </div>
  );
}

export default function Brain3D() {
  return (
    <div style={{
      width: '280px',
      height: '280px',
      borderRadius: '50%',
      backgroundImage: `url(${brainGraphic})`,
      backgroundSize: '105%',
      backgroundPosition: 'center',
      border: '4px solid #005696',
      boxShadow: '0 0 35px rgba(0, 99, 169, 0.75), inset 0 0 25px rgba(70, 241, 197, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      margin: '0 auto 10px auto'
    }}>
      <Suspense fallback={<LoadingPlaceholder />}>
        <BrainCanvas />
      </Suspense>
    </div>
  );
}
