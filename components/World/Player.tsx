
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Physics Constants
const GRAVITY = 50;
const JUMP_FORCE = 16; // Results in ~2.56 height (v^2 / 2g)

// Static Geometries
// Adjusted for a more feminine "Glam" silhouette
const TORSO_GEO = new THREE.CylinderGeometry(0.18, 0.12, 0.5, 4); // Tapered waist
const CHEST_GEO = new THREE.CylinderGeometry(0.14, 0.18, 0.25, 4); // Upper torso
const JETPACK_GEO = new THREE.BoxGeometry(0.2, 0.3, 0.1);
const GLOW_STRIP_GEO = new THREE.PlaneGeometry(0.05, 0.2);
const HEAD_GEO = new THREE.SphereGeometry(0.18, 16, 16);
const PONYTAIL_GEO = new THREE.CylinderGeometry(0.04, 0.08, 0.4, 8);
const HAIR_TIE_GEO = new THREE.TorusGeometry(0.06, 0.02, 8, 16);

const ARM_GEO = new THREE.CylinderGeometry(0.05, 0.04, 0.55, 8);
const JOINT_SPHERE_GEO = new THREE.SphereGeometry(0.06);
const HIPS_GEO = new THREE.CylinderGeometry(0.12, 0.22, 0.25, 4); // Wider hips
const LEG_GEO = new THREE.CylinderGeometry(0.07, 0.05, 0.7, 8); // Slender legs
const HEEL_GEO = new THREE.BoxGeometry(0.08, 0.1, 0.08); // High heel block
const SHADOW_GEO = new THREE.CircleGeometry(0.5, 32);

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  // Limb Refs for Animation
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const ponytailRef = useRef<THREE.Group>(null);

  const { status, laneCount, takeDamage, hasDoubleJump, activateImmortality, isImmortalityActive } = useStore();
  
  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  
  // Physics State (using Refs for immediate logic updates)
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0); 
  const spinRotation = useRef(0); // For double jump flip

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const isInvincible = useRef(false);
  const lastDamageTime = useRef(0);

  // Memoized Materials
  const { armorMaterial, skinMaterial, hairMaterial, glowMaterial, shadowMaterial } = useMemo(() => {
      // Hot Pink Armor by default, Gold when Immortal
      const armorColor = isImmortalityActive ? '#ffd700' : '#ff00cc';
      const glowColor = isImmortalityActive ? '#ffffff' : '#00ffff';
      const skinColor = '#333333'; // Dark cyber suit under-layer
      
      return {
          armorMaterial: new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.3, metalness: 0.8 }),
          skinMaterial: new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7, metalness: 0.5 }),
          hairMaterial: new THREE.MeshStandardMaterial({ color: '#ff69b4', roughness: 0.4, metalness: 0.2 }),
          glowMaterial: new THREE.MeshBasicMaterial({ color: glowColor }),
          shadowMaterial: new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.3, transparent: true })
      };
  }, [isImmortalityActive]); 

  // --- Reset State on Game Start ---
  useEffect(() => {
      if (status === GameStatus.PLAYING) {
          isJumping.current = false;
          jumpsPerformed.current = 0;
          velocityY.current = 0;
          spinRotation.current = 0;
          if (groupRef.current) groupRef.current.position.y = 0;
          if (bodyRef.current) bodyRef.current.rotation.x = 0;
      }
  }, [status]);
  
  useEffect(() => {
      const maxLane = Math.floor(laneCount / 2);
      if (Math.abs(lane) > maxLane) {
          setLane(l => Math.max(Math.min(l, maxLane), -maxLane));
      }
  }, [laneCount, lane]);

  // --- Controls (Keyboard & Touch) ---
  const triggerJump = () => {
    const maxJumps = hasDoubleJump ? 2 : 1;

    if (!isJumping.current) {
        audio.playJump(false);
        isJumping.current = true;
        jumpsPerformed.current = 1;
        velocityY.current = JUMP_FORCE;
    } else if (jumpsPerformed.current < maxJumps) {
        audio.playJump(true);
        jumpsPerformed.current += 1;
        velocityY.current = JUMP_FORCE; 
        spinRotation.current = 0; 
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);

      if (e.key === 'ArrowLeft' || e.key === 'a') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight' || e.key === 'd') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w') triggerJump();
      else if (e.key === ' ' || e.key === 'Enter') {
          activateImmortality();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (status !== GameStatus.PLAYING) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        const maxLane = Math.floor(laneCount / 2);

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
             if (deltaX > 0) setLane(l => Math.min(l + 1, maxLane));
             else setLane(l => Math.max(l - 1, -maxLane));
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -30) {
            triggerJump();
        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            activateImmortality();
        }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  // --- Animation Loop ---
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    // 1. Horizontal Position
    targetX.current = lane * LANE_WIDTH;
    groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x, 
        targetX.current, 
        delta * 15 
    );

    // 2. Physics (Jump)
    if (isJumping.current) {
        groupRef.current.position.y += velocityY.current * delta;
        velocityY.current -= GRAVITY * delta;

        if (groupRef.current.position.y <= 0) {
            groupRef.current.position.y = 0;
            isJumping.current = false;
            jumpsPerformed.current = 0;
            velocityY.current = 0;
            if (bodyRef.current) bodyRef.current.rotation.x = 0;
        }

        if (jumpsPerformed.current === 2 && bodyRef.current) {
             spinRotation.current -= delta * 15;
             if (spinRotation.current < -Math.PI * 2) spinRotation.current = -Math.PI * 2;
             bodyRef.current.rotation.x = spinRotation.current;
        }
    }

    // Banking Rotation
    const xDiff = targetX.current - groupRef.current.position.x;
    groupRef.current.rotation.z = -xDiff * 0.2; 
    groupRef.current.rotation.x = isJumping.current ? 0.1 : 0.05; 

    // 3. Skeletal Animation
    const time = state.clock.elapsedTime * 25; 
    
    // Ponytail bounce physics simulation
    if (ponytailRef.current) {
        const bounce = isJumping.current ? velocityY.current * 0.05 : Math.sin(time * 2) * 0.3;
        // Lag the hair behind movement
        ponytailRef.current.rotation.x = THREE.MathUtils.lerp(ponytailRef.current.rotation.x, 0.5 + bounce + (isJumping.current ? 1 : 0), delta * 10);
    }

    if (!isJumping.current) {
        // Running Cycle - More feminine sway
        if (leftArmRef.current) {
             leftArmRef.current.rotation.x = Math.sin(time) * 0.8;
             leftArmRef.current.rotation.z = 0.2; // Hold arms out slightly
        }
        if (rightArmRef.current) {
            rightArmRef.current.rotation.x = Math.sin(time + Math.PI) * 0.8;
            rightArmRef.current.rotation.z = -0.2;
        }
        if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time + Math.PI) * 1.2;
        if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time) * 1.2;
        
        if (bodyRef.current) bodyRef.current.position.y = 1.1 + Math.abs(Math.sin(time)) * 0.1;
    } else {
        // Jumping Pose
        const jumpPoseSpeed = delta * 10;
        if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -2.5, jumpPoseSpeed);
        if (rightArmRef.current) rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -2.5, jumpPoseSpeed);
        if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0.5, jumpPoseSpeed);
        if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, -0.5, jumpPoseSpeed);
        
        if (bodyRef.current && jumpsPerformed.current !== 2) bodyRef.current.position.y = 1.1; 
    }

    // 4. Dynamic Shadow
    if (shadowRef.current) {
        const height = groupRef.current.position.y;
        const scale = Math.max(0.2, 1 - (height / 2.5) * 0.5); 
        const runStretch = isJumping.current ? 1 : 1 + Math.abs(Math.sin(time)) * 0.3;

        shadowRef.current.scale.set(scale, scale, scale * runStretch);
        const material = shadowRef.current.material as THREE.MeshBasicMaterial;
        if (material && !Array.isArray(material)) {
            material.opacity = Math.max(0.1, 0.3 - (height / 2.5) * 0.2);
        }
    }

    // Invincibility / Immortality Effect
    const showFlicker = isInvincible.current || isImmortalityActive;
    if (showFlicker) {
        if (isInvincible.current) {
             if (Date.now() - lastDamageTime.current > 1500) {
                isInvincible.current = false;
                groupRef.current.visible = true;
             } else {
                groupRef.current.visible = Math.floor(Date.now() / 50) % 2 === 0;
             }
        } 
        if (isImmortalityActive) {
            groupRef.current.visible = true; 
        }
    } else {
        groupRef.current.visible = true;
    }
  });

  // Damage Handler
  useEffect(() => {
     const checkHit = (e: any) => {
        if (isInvincible.current || isImmortalityActive) return;
        audio.playDamage();
        takeDamage();
        isInvincible.current = true;
        lastDamageTime.current = Date.now();
     };
     window.addEventListener('player-hit', checkHit);
     return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isImmortalityActive]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={bodyRef} position={[0, 1.1, 0]}> 
        
        {/* --- Upper Body --- */}
        {/* Waist/Stomach */}
        <mesh castShadow position={[0, 0.05, 0]} geometry={TORSO_GEO} material={skinMaterial} />
        
        {/* Chest/Armor */}
        <mesh castShadow position={[0, 0.3, 0]} geometry={CHEST_GEO} material={armorMaterial} />

        {/* Jetpack */}
        <mesh position={[0, 0.25, -0.18]} geometry={JETPACK_GEO} material={skinMaterial} />
        <mesh position={[-0.08, 0.25, -0.24]} geometry={GLOW_STRIP_GEO} material={glowMaterial} />
        <mesh position={[0.08, 0.25, -0.24]} geometry={GLOW_STRIP_GEO} material={glowMaterial} />

        {/* Head Group */}
        <group ref={headRef} position={[0, 0.6, 0]}>
            <mesh castShadow geometry={HEAD_GEO} material={armorMaterial} />
            {/* Visor/Face Glow */}
            <mesh position={[0, 0, 0.14]} rotation={[0.2, 0, 0]}>
                <planeGeometry args={[0.18, 0.1]} />
                <meshBasicMaterial color="#00ffff" />
            </mesh>
            {/* Ponytail */}
            <group ref={ponytailRef} position={[0, 0.1, -0.15]} rotation={[0.5, 0, 0]}>
                 <mesh geometry={HAIR_TIE_GEO} material={glowMaterial} />
                 <mesh position={[0, -0.2, 0]} geometry={PONYTAIL_GEO} material={hairMaterial} />
            </group>
        </group>

        {/* --- Arms --- */}
        <group position={[0.22, 0.35, 0]}>
            <group ref={rightArmRef}>
                <mesh position={[0, -0.25, 0]} castShadow geometry={ARM_GEO} material={skinMaterial} />
                {/* Shoulder Pad */}
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[0.09]} />
                    <meshStandardMaterial color={isImmortalityActive ? '#ffd700' : '#ff00cc'} metalness={0.8} />
                </mesh>
            </group>
        </group>
        <group position={[-0.22, 0.35, 0]}>
            <group ref={leftArmRef}>
                 <mesh position={[0, -0.25, 0]} castShadow geometry={ARM_GEO} material={skinMaterial} />
                 <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[0.09]} />
                    <meshStandardMaterial color={isImmortalityActive ? '#ffd700' : '#ff00cc'} metalness={0.8} />
                </mesh>
            </group>
        </group>

        {/* --- Lower Body --- */}
        {/* Hips */}
        <mesh position={[0, -0.2, 0]} geometry={HIPS_GEO} material={armorMaterial} />

        {/* Legs */}
        <group position={[0.14, -0.35, 0]}>
            <group ref={rightLegRef}>
                 <mesh position={[0, -0.35, 0]} castShadow geometry={LEG_GEO} material={skinMaterial} />
                 {/* Boot/Heel */}
                 <mesh position={[0, -0.65, 0.02]} geometry={HEEL_GEO} material={armorMaterial} />
                 <mesh position={[0, -0.7, -0.04]} rotation={[0.5, 0, 0]}>
                     <boxGeometry args={[0.04, 0.1, 0.04]} />
                     <meshStandardMaterial color="#333" />
                 </mesh>
            </group>
        </group>
        <group position={[-0.14, -0.35, 0]}>
            <group ref={leftLegRef}>
                 <mesh position={[0, -0.35, 0]} castShadow geometry={LEG_GEO} material={skinMaterial} />
                 {/* Boot/Heel */}
                 <mesh position={[0, -0.65, 0.02]} geometry={HEEL_GEO} material={armorMaterial} />
                 <mesh position={[0, -0.7, -0.04]} rotation={[0.5, 0, 0]}>
                     <boxGeometry args={[0.04, 0.1, 0.04]} />
                     <meshStandardMaterial color="#333" />
                 </mesh>
            </group>
        </group>
      </group>
      
      <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHADOW_GEO} material={shadowMaterial} />
    </group>
  );
};
