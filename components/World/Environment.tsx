
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH } from '../../types';

const StarField: React.FC = () => {
  const speed = useStore(state => state.speed);
  const count = 3000;
  const meshRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x = (Math.random() - 0.5) * 400;
      let y = (Math.random() - 0.5) * 200 + 50; 
      let z = -550 + Math.random() * 650;

      if (Math.abs(x) < 15 && y > -5 && y < 20) {
          if (x < 0) x -= 15;
          else x += 15;
      }

      pos[i * 3] = x;     
      pos[i * 3 + 1] = y; 
      pos[i * 3 + 2] = z; 
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const activeSpeed = speed > 0 ? speed : 2;

    for (let i = 0; i < count; i++) {
        let z = positions[i * 3 + 2];
        z += activeSpeed * delta * 2.0; 
        
        if (z > 100) {
            z = -550 - Math.random() * 50; 
            
            let x = (Math.random() - 0.5) * 400;
            let y = (Math.random() - 0.5) * 200 + 50;
            
            if (Math.abs(x) < 15 && y > -5 && y < 20) {
                if (x < 0) x -= 15;
                else x += 15;
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
        }
        positions[i * 3 + 2] = z;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.7}
        color="#00ffff" // Cyan Stars for contrast
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
};

const LaneGuides: React.FC = () => {
    const { laneCount } = useStore();
    
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        
        for (let i = 0; i <= laneCount; i++) {
            lines.push(startX + (i * LANE_WIDTH));
        }
        return lines;
    }, [laneCount]);

    return (
        <group position={[0, 0.02, 0]}>
            {/* Lane Floor - Dark Indigo */}
            <mesh position={[0, -0.02, -20]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[laneCount * LANE_WIDTH, 200]} />
                <meshBasicMaterial color="#1a0b2e" transparent opacity={0.95} />
            </mesh>

            {/* Lane Separators - Electric Lime Neon */}
            {separators.map((x, i) => (
                <mesh key={`sep-${i}`} position={[x, 0, -20]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.08, 200]} /> 
                    <meshBasicMaterial 
                        color="#ccff00" 
                        transparent 
                        opacity={0.8} 
                    />
                </mesh>
            ))}
        </group>
    );
};

const RetroSun: React.FC = () => {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const sunGroupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (matRef.current) {
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
        if (sunGroupRef.current) {
            sunGroupRef.current.position.y = 30 + Math.sin(state.clock.elapsedTime * 0.2) * 1.0;
            sunGroupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
        }
    });

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColorTop: { value: new THREE.Color('#ff00cc') }, // HotPink
        uColorBottom: { value: new THREE.Color('#00ffff') } // Cyan
    }), []);

    return (
        <group ref={sunGroupRef} position={[0, 30, -180]}>
            <mesh>
                <sphereGeometry args={[35, 32, 32]} />
                <shaderMaterial
                    ref={matRef}
                    uniforms={uniforms}
                    transparent
                    vertexShader={`
                        varying vec2 vUv;

                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        uniform float uTime;
                        uniform vec3 uColorTop;
                        uniform vec3 uColorBottom;
                        varying vec2 vUv;

                        void main() {
                            // Gradient
                            vec3 color = mix(uColorBottom, uColorTop, vUv.y);
                            
                            // Scanlines
                            float scanline = sin(vUv.y * 80.0 - uTime * 2.0);
                            if (scanline > 0.9) discard; // Cut out lines

                            gl_FragColor = vec4(color, 1.0);
                        }
                    `}
                />
            </mesh>
             {/* Glow Halo */}
            <mesh scale={[1.2, 1.2, 1.2]} position={[0, 0, -1]}>
                <circleGeometry args={[35, 64]} />
                <meshBasicMaterial color="#ccff00" transparent opacity={0.1} />
            </mesh>
        </group>
    );
};

export const Environment: React.FC = () => {
  return (
    <group>
      <color attach="background" args={['#050011']} /> {/* Very Dark background */}
      <fog attach="fog" args={['#050011', 30, 120]} />
      
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#ccff00" castShadow />
      <pointLight position={[0, 5, -10]} intensity={2} color="#ff00cc" distance={50} />
      
      <StarField />
      <RetroSun />
      <LaneGuides />
      
      {/* Horizon Glow - Hot Pink */}
      <mesh position={[0, 0, -190]}>
          <planeGeometry args={[600, 100]} />
          <meshBasicMaterial color="#ff00cc" transparent opacity={0.15} />
      </mesh>
    </group>
  );
};
