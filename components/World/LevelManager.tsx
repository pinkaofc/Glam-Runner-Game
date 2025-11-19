
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center, Float } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { GameObject, ObjectType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GLAM_COLORS, MakeupVariant } from '../../types';
import { audio } from '../System/Audio';

// --- Geometries ---

// Obstacle: High Contrast Barrier (Neon Lime/Black)
const OBSTACLE_HEIGHT = 1.8;
const OBSTACLE_GEO = new THREE.BoxGeometry(1.8, OBSTACLE_HEIGHT, 0.5);
const OBSTACLE_STRIPE_GEO = new THREE.BoxGeometry(1.85, 0.2, 0.55); // Stripes

// Makeup: Lipstick
const LIPSTICK_BASE_GEO = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12);
const LIPSTICK_TIP_GEO = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12);
const LIPSTICK_SLANT_GEO = new THREE.CylinderGeometry(0.12, 0.0, 0.1, 12); // Slant top

// Makeup: Compact
const COMPACT_BASE_GEO = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
const COMPACT_LID_GEO = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);

// Makeup: Perfume
const PERFUME_BODY_GEO = new THREE.BoxGeometry(0.4, 0.5, 0.2);
const PERFUME_NECK_GEO = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8);
const PERFUME_CAP_GEO = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);

// Alien Geometries (Reskinned to "Glitch Drone")
const ALIEN_BODY_GEO = new THREE.OctahedronGeometry(0.5, 0);
const ALIEN_RING_GEO = new THREE.TorusGeometry(0.8, 0.05, 8, 4);

// Missile Geometries
const MISSILE_CORE_GEO = new THREE.CylinderGeometry(0.08, 0.08, 3.0, 8);
const MISSILE_RING_GEO = new THREE.TorusGeometry(0.15, 0.02, 16, 32);

// Shadow Geometries
const SHADOW_LETTER_GEO = new THREE.PlaneGeometry(2, 0.6);
const SHADOW_ITEM_GEO = new THREE.CircleGeometry(0.5, 32);
const SHADOW_ALIEN_GEO = new THREE.CircleGeometry(0.8, 32);
const SHADOW_MISSILE_GEO = new THREE.PlaneGeometry(0.15, 3);
const SHADOW_DEFAULT_GEO = new THREE.CircleGeometry(0.8, 6);

// Shop Geometries
const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1);
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2);
const SHOP_OUTLINE_GEO = new THREE.BoxGeometry(1, 7.2, 0.8);
const SHOP_FLOOR_GEO = new THREE.PlaneGeometry(1, 4);

const PARTICLE_COUNT = 600;
const BASE_LETTER_INTERVAL = 120; 

// Revised interval calculation for infinite play
// Cap the max distance between letters so the game doesn't become empty at high levels
const getLetterInterval = (level: number) => {
    const scalingFactor = Math.min(2.5, 1 + (level * 0.15)); // Caps at 2.5x base interval
    return BASE_LETTER_INTERVAL * scalingFactor;
};

const MISSILE_SPEED = 30;

// Font for 3D Text
const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// --- Particle System ---
const ParticleSystem: React.FC = () => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color()
    })), []);

    useEffect(() => {
        const handleExplosion = (e: CustomEvent) => {
            const { position, color } = e.detail;
            let spawned = 0;
            const burstAmount = 40; 

            for(let i = 0; i < PARTICLE_COUNT; i++) {
                const p = particles[i];
                if (p.life <= 0) {
                    p.life = 1.0 + Math.random() * 0.5; 
                    p.pos.set(position[0], position[1], position[2]);
                    
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const speed = 2 + Math.random() * 10;
                    
                    p.vel.set(
                        Math.sin(phi) * Math.cos(theta),
                        Math.sin(phi) * Math.sin(theta),
                        Math.cos(phi)
                    ).multiplyScalar(speed);

                    p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    p.rotVel.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(5);
                    
                    p.color.set(color);
                    
                    spawned++;
                    if (spawned >= burstAmount) break;
                }
            }
        };
        
        window.addEventListener('particle-burst', handleExplosion as any);
        return () => window.removeEventListener('particle-burst', handleExplosion as any);
    }, [particles]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const safeDelta = Math.min(delta, 0.1);

        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= safeDelta * 1.5;
                p.pos.addScaledVector(p.vel, safeDelta);
                p.vel.y -= safeDelta * 5; 
                p.vel.multiplyScalar(0.98);

                p.rot.x += p.rotVel.x * safeDelta;
                p.rot.y += p.rotVel.y * safeDelta;
                
                dummy.position.copy(p.pos);
                const scale = Math.max(0, p.life * 0.25);
                dummy.scale.set(scale, scale, scale);
                
                dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
                dummy.updateMatrix();
                
                mesh.current!.setMatrixAt(i, dummy.matrix);
                mesh.current!.setColorAt(i, p.color);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
        </instancedMesh>
    );
};


const getRandomLane = (laneCount: number) => {
    const max = Math.floor(laneCount / 2);
    return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const { 
    status, 
    speed, 
    collectItem, 
    collectLetter, 
    collectedLetters,
    laneCount,
    setDistance,
    openShop,
    level,
    targetWord 
  } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
        objectsRef.current = [];
        setRenderTrigger(t => t + 1);
        
        distanceTraveled.current = 0;
        nextLetterDistance.current = getLetterInterval(1);

    } else if (isLevelUp && level > 1) {
        objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);

        objectsRef.current.push({
            id: uuidv4(),
            type: ObjectType.SHOP_PORTAL,
            position: [0, 0, -100], 
            active: true,
        });
        
        nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
        setRenderTrigger(t => t + 1);
        
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
        setDistance(Math.floor(distanceTraveled.current));
    }
    
    prevStatus.current = status;
    prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) {
              playerObjRef.current = group.children[0];
          }
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05); 
    const dist = speed * safeDelta;
    
    distanceTraveled.current += dist;

    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    
    if (playerObjRef.current) {
        playerObjRef.current.getWorldPosition(playerPos);
    }

    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    for (const obj of currentObjects) {
        let moveAmount = dist;
        
        if (obj.type === ObjectType.MISSILE) {
            moveAmount += MISSILE_SPEED * safeDelta;
        }

        const prevZ = obj.position[2];
        obj.position[2] += moveAmount;
        
        if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
             if (obj.position[2] > -90) {
                 obj.hasFired = true;
                 newSpawns.push({
                     id: uuidv4(),
                     type: ObjectType.MISSILE,
                     position: [obj.position[0], 1.0, obj.position[2] + 2],
                     active: true,
                     color: '#ccff00' // Lime Missile
                 });
                 hasChanges = true;
                 
                 window.dispatchEvent(new CustomEvent('particle-burst', { 
                    detail: { position: obj.position, color: '#ccff00' } 
                 }));
             }
        }

        let keep = true;
        if (obj.active) {
            const zThreshold = 2.0; 
            const inZZone = (prevZ < playerPos.z + zThreshold) && (obj.position[2] > playerPos.z - zThreshold);
            
            if (obj.type === ObjectType.SHOP_PORTAL) {
                const dz = Math.abs(obj.position[2] - playerPos.z);
                if (dz < 2) { 
                     openShop();
                     obj.active = false;
                     hasChanges = true;
                     keep = false; 
                }
            } else if (inZZone) {
                const dx = Math.abs(obj.position[0] - playerPos.x);
                if (dx < 0.9) { 
                     
                     const isDamageSource = obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.ALIEN || obj.type === ObjectType.MISSILE;
                     
                     if (isDamageSource) {
                         const playerBottom = playerPos.y;
                         const playerTop = playerPos.y + 1.8; 

                         let objBottom = obj.position[1] - 0.5;
                         let objTop = obj.position[1] + 0.5;

                         if (obj.type === ObjectType.OBSTACLE) {
                             objBottom = 0;
                             objTop = OBSTACLE_HEIGHT;
                         } else if (obj.type === ObjectType.MISSILE) {
                             objBottom = 0.5;
                             objTop = 1.5;
                         }

                         const isHit = (playerBottom < objTop) && (playerTop > objBottom);

                         if (isHit) { 
                             window.dispatchEvent(new Event('player-hit'));
                             obj.active = false; 
                             hasChanges = true;
                             
                             if (obj.type === ObjectType.MISSILE) {
                                window.dispatchEvent(new CustomEvent('particle-burst', { 
                                    detail: { position: obj.position, color: '#ccff00' } 
                                }));
                             }
                         }
                     } else {
                         const dy = Math.abs(obj.position[1] - playerPos.y);
                         if (dy < 2.5) { 
                            if (obj.type === ObjectType.ITEM) {
                                collectItem(obj.points || 50);
                                audio.playGemCollect();
                            }
                            if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                                collectLetter(obj.targetIndex);
                                audio.playLetterCollect();
                            }
                            
                            window.dispatchEvent(new CustomEvent('particle-burst', { 
                                detail: { 
                                    position: obj.position, 
                                    color: obj.color || '#ffffff' 
                                } 
                            }));

                            obj.active = false;
                            hasChanges = true;
                         }
                     }
                }
            }
        }

        if (obj.position[2] > REMOVE_DISTANCE) {
            keep = false;
            hasChanges = true;
        }

        if (keep) {
            keptObjects.push(obj);
        }
    }

    if (newSpawns.length > 0) {
        keptObjects.push(...newSpawns);
    }

    let furthestZ = 0;
    const staticObjects = keptObjects.filter(o => o.type !== ObjectType.MISSILE);
    
    if (staticObjects.length > 0) {
        furthestZ = Math.min(...staticObjects.map(o => o.position[2]));
    } else {
        furthestZ = -20;
    }

    if (furthestZ > -SPAWN_DISTANCE) {
         const minGap = 12 + (speed * 0.4); 
         const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);
         
         const isLetterDue = distanceTraveled.current >= nextLetterDistance.current;

         if (isLetterDue) {
             const lane = getRandomLane(laneCount);
             const target = targetWord; 
             
             const availableIndices = target.map((_, i) => i).filter(i => !collectedLetters.includes(i));

             if (availableIndices.length > 0) {
                 const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                 const val = target[chosenIndex];
                 const color = GLAM_COLORS[chosenIndex % GLAM_COLORS.length];

                 keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.LETTER,
                    position: [lane * LANE_WIDTH, 1.0, spawnZ], 
                    active: true,
                    color: color,
                    value: val,
                    targetIndex: chosenIndex
                 });
                 
                 nextLetterDistance.current += getLetterInterval(level);
                 hasChanges = true;
             } else {
                // Fallback to Makeup Item
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.ITEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    variant: MakeupVariant.LIPSTICK,
                    points: 50
                });
                hasChanges = true;
             }

         } else if (Math.random() > 0.1) { 
            
            const isObstacle = Math.random() > 0.30; // 70% Obstacle, 30% Item

            if (isObstacle) {
                const spawnAlien = level >= 2 && Math.random() < 0.2; 

                if (spawnAlien) {
                    const availableLanes = [];
                    const maxLane = Math.floor(laneCount / 2);
                    for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
                    availableLanes.sort(() => Math.random() - 0.5);

                    let alienCount = 1;
                    const pAlien = Math.random();
                    
                    if (pAlien > 0.7) alienCount = Math.min(2, availableLanes.length);
                    if (pAlien > 0.9 && availableLanes.length >= 3) alienCount = 3;

                    for (let k = 0; k < alienCount; k++) {
                        const lane = availableLanes[k];
                        keptObjects.push({
                            id: uuidv4(),
                            type: ObjectType.ALIEN,
                            position: [lane * LANE_WIDTH, 1.5, spawnZ],
                            active: true,
                            color: '#ccff00', // Lime Alien
                            hasFired: false
                        });
                    }
                } else {
                    const availableLanes = [];
                    const maxLane = Math.floor(laneCount / 2);
                    for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
                    availableLanes.sort(() => Math.random() - 0.5);
                    
                    let countToSpawn = 1;
                    const p = Math.random();

                    if (p > 0.80) countToSpawn = Math.min(3, availableLanes.length);
                    else if (p > 0.50) countToSpawn = Math.min(2, availableLanes.length);
                    else countToSpawn = 1;

                    for (let i = 0; i < countToSpawn; i++) {
                        const lane = availableLanes[i];
                        const laneX = lane * LANE_WIDTH;
                        
                        keptObjects.push({
                            id: uuidv4(),
                            type: ObjectType.OBSTACLE,
                            position: [laneX, OBSTACLE_HEIGHT / 2, spawnZ],
                            active: true,
                        });

                        if (Math.random() < 0.3) {
                             const variants = Object.values(MakeupVariant);
                             const randomVariant = variants[Math.floor(Math.random() * variants.length)];
                             keptObjects.push({
                                id: uuidv4(),
                                type: ObjectType.ITEM,
                                position: [laneX, OBSTACLE_HEIGHT + 1.0, spawnZ],
                                active: true,
                                variant: randomVariant,
                                points: 100
                            });
                        }
                    }
                }

            } else {
                // GROUND MAKEUP SPAWNING
                const lane = getRandomLane(laneCount);
                const variants = Object.values(MakeupVariant);
                const randomVariant = variants[Math.floor(Math.random() * variants.length)];
                
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.ITEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    variant: randomVariant,
                    points: 50
                });
            }
            hasChanges = true;
         }
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => {
        if (!obj.active) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualRef = useRef<THREE.Group>(null);
    const shadowRef = useRef<THREE.Mesh>(null);
    const { laneCount } = useStore();
    
    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.set(data.position[0], 0, data.position[2]);
        }

        if (visualRef.current) {
            const baseHeight = data.position[1];
            
            if (data.type === ObjectType.SHOP_PORTAL) {
                 visualRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
            } else if (data.type === ObjectType.MISSILE) {
                 visualRef.current.rotation.z += delta * 20; 
                 visualRef.current.position.y = baseHeight;
            } else if (data.type === ObjectType.ALIEN) {
                 visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.2;
                 visualRef.current.rotation.y += delta;
            } else if (data.type !== ObjectType.OBSTACLE) {
                // Makeup / Letter Bobbing
                visualRef.current.rotation.y += delta * 2;
                const bobOffset = Math.sin(state.clock.elapsedTime * 4 + data.position[0]) * 0.1;
                visualRef.current.position.y = baseHeight + bobOffset;
                
                if (shadowRef.current) {
                    const shadowScale = 1 - bobOffset; 
                    shadowRef.current.scale.setScalar(shadowScale);
                }
            } else {
                visualRef.current.position.y = baseHeight;
            }
        }
    });

    const shadowGeo = useMemo(() => {
        if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
        if (data.type === ObjectType.ITEM) return SHADOW_ITEM_GEO;
        if (data.type === ObjectType.SHOP_PORTAL) return null; 
        if (data.type === ObjectType.ALIEN) return SHADOW_ALIEN_GEO;
        if (data.type === ObjectType.MISSILE) return SHADOW_MISSILE_GEO;
        return SHADOW_DEFAULT_GEO; 
    }, [data.type]);

    return (
        <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
            {data.type !== ObjectType.SHOP_PORTAL && shadowGeo && (
                <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={shadowGeo}>
                    <meshBasicMaterial color="#000000" opacity={0.5} transparent />
                </mesh>
            )}

            <group ref={visualRef} position={[0, data.position[1], 0]}>
                {/* --- SHOP PORTAL --- */}
                {data.type === ObjectType.SHOP_PORTAL && (
                    <group>
                         <mesh position={[0, 3, 0]} geometry={SHOP_FRAME_GEO} scale={[laneCount * LANE_WIDTH + 2, 1, 1]}>
                             <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
                         </mesh>
                         <mesh position={[0, 2, 0]} geometry={SHOP_BACK_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
                              <meshBasicMaterial color="#000000" />
                         </mesh>
                         <mesh position={[0, 3, 0]} geometry={SHOP_OUTLINE_GEO} scale={[laneCount * LANE_WIDTH + 2.2, 1, 1]}>
                             <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.8} />
                         </mesh>
                         <Center position={[0, 5, 0.6]}>
                             <Text3D font={FONT_URL} size={1.2} height={0.2}>
                                 GLAM SHOP
                                 <meshBasicMaterial color="#00ffff" />
                             </Text3D>
                         </Center>
                         <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHOP_FLOOR_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
                             <meshBasicMaterial color="#ccff00" transparent opacity={0.3} />
                         </mesh>
                    </group>
                )}

                {/* --- OBSTACLE (BARRIER) --- */}
                {data.type === ObjectType.OBSTACLE && (
                    <group>
                        {/* Main Black Body */}
                        <mesh geometry={OBSTACLE_GEO} castShadow receiveShadow>
                             <meshStandardMaterial 
                                 color="#050505" 
                                 roughness={0.2} 
                                 metalness={0.8} 
                             />
                        </mesh>
                        {/* Neon Stripes */}
                        <mesh position={[0, 0.5, 0]} geometry={OBSTACLE_STRIPE_GEO}>
                             <meshBasicMaterial color="#ccff00" /> 
                        </mesh>
                        <mesh position={[0, -0.5, 0]} geometry={OBSTACLE_STRIPE_GEO}>
                             <meshBasicMaterial color="#ccff00" />
                        </mesh>
                    </group>
                )}

                {/* --- ALIEN (GLITCH DRONE) --- */}
                {data.type === ObjectType.ALIEN && (
                    <group>
                        <mesh castShadow geometry={ALIEN_BODY_GEO}>
                            <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} wireframe />
                        </mesh>
                        <mesh castShadow geometry={ALIEN_BODY_GEO} scale={[0.9,0.9,0.9]}>
                            <meshBasicMaterial color="#ccff00" transparent opacity={0.4} />
                        </mesh>
                        <mesh rotation={[Math.PI/2, 0, 0]} geometry={ALIEN_RING_GEO}>
                            <meshBasicMaterial color="#ccff00" />
                        </mesh>
                    </group>
                )}

                {/* --- MISSILE (NEON BEAM) --- */}
                {data.type === ObjectType.MISSILE && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <mesh geometry={MISSILE_CORE_GEO}>
                            <meshBasicMaterial color="#ccff00" />
                        </mesh>
                        <mesh position={[0, 1.0, 0]} geometry={MISSILE_RING_GEO}>
                            <meshBasicMaterial color="#ffffff" />
                        </mesh>
                        <mesh position={[0, -1.0, 0]} geometry={MISSILE_RING_GEO}>
                            <meshBasicMaterial color="#ffffff" />
                        </mesh>
                    </group>
                )}

                {/* --- MAKEUP ITEMS (Replacements for GEMS) --- */}
                {data.type === ObjectType.ITEM && (
                    <group>
                        {data.variant === MakeupVariant.LIPSTICK && (
                            <group>
                                {/* Gold Base */}
                                <mesh geometry={LIPSTICK_BASE_GEO} castShadow>
                                    <meshStandardMaterial color="#ffd700" metalness={1.0} roughness={0.1} />
                                </mesh>
                                {/* Red Tip */}
                                <mesh position={[0, 0.35, 0]} geometry={LIPSTICK_TIP_GEO}>
                                    <meshStandardMaterial color="#ff0000" roughness={0.2} />
                                </mesh>
                                {/* Slant */}
                                <mesh position={[0, 0.5, 0]} rotation={[0.5,0,0]} geometry={LIPSTICK_SLANT_GEO}>
                                     <meshStandardMaterial color="#ff0000" roughness={0.2} />
                                </mesh>
                            </group>
                        )}
                        {data.variant === MakeupVariant.PERFUME && (
                             <group>
                                {/* Glass Body */}
                                <mesh geometry={PERFUME_BODY_GEO} castShadow>
                                    <meshPhysicalMaterial 
                                        color="#00ffff" 
                                        transmission={0.9} 
                                        opacity={1} 
                                        metalness={0} 
                                        roughness={0} 
                                        thickness={1}
                                    />
                                </mesh>
                                {/* Gold Neck */}
                                <mesh position={[0, 0.3, 0]} geometry={PERFUME_NECK_GEO}>
                                    <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.2} />
                                </mesh>
                                {/* Cap */}
                                <mesh position={[0, 0.4, 0]} geometry={PERFUME_CAP_GEO}>
                                    <meshStandardMaterial color="#ff00cc" />
                                </mesh>
                             </group>
                        )}
                        {data.variant === MakeupVariant.COMPACT && (
                             <group rotation={[Math.PI/4, 0, 0]}>
                                {/* Base */}
                                <mesh geometry={COMPACT_BASE_GEO} castShadow>
                                    <meshStandardMaterial color="#ff69b4" metalness={0.5} />
                                </mesh>
                                {/* Mirror Part (Open) */}
                                <mesh position={[0, 0.15, -0.1]} rotation={[-Math.PI/3, 0, 0]} geometry={COMPACT_LID_GEO}>
                                    <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0} />
                                </mesh>
                                {/* Back of lid */}
                                <mesh position={[0, 0.16, -0.11]} rotation={[-Math.PI/3, 0, 0]} scale={[1.05, 1, 1.05]} geometry={COMPACT_LID_GEO}>
                                    <meshStandardMaterial color="#ff69b4" />
                                </mesh>
                             </group>
                        )}
                        {/* Fallback if no variant set */}
                        {!data.variant && (
                            <mesh geometry={new THREE.IcosahedronGeometry(0.3)}>
                                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
                            </mesh>
                        )}
                    </group>
                )}

                {/* --- LETTER --- */}
                {data.type === ObjectType.LETTER && (
                    <group scale={[1.5, 1.5, 1.5]}>
                         <Center>
                             <Text3D 
                                font={FONT_URL} 
                                size={0.8} 
                                height={0.5} 
                                bevelEnabled
                                bevelThickness={0.02}
                                bevelSize={0.02}
                                bevelSegments={5}
                             >
                                {data.value}
                                <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.2} />
                             </Text3D>
                         </Center>
                    </group>
                )}
            </group>
        </group>
    );
});
