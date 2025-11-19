
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { create } from 'zustand';
import { GameStatus, RUN_SPEED_BASE } from './types';

interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  collectedLetters: number[]; 
  targetWord: string[]; // Dynamic target word
  level: number;
  laneCount: number;
  itemsCollected: number; // Renamed from gemsCollected
  distance: number;
  
  // Inventory / Abilities
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;

  // Actions
  startGame: () => void;
  restartGame: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectItem: (value: number) => void; // Renamed from collectGem
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  
  // Shop / Abilities
  buyItem: (type: 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL', cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;
}

const FIRST_WORD = "SASSY";
const WORD_POOL = ['QUEEN', 'SLAY', 'GLAM', 'DIVA', 'ICONIC', 'CHIC', 'BOSS', 'VIBE', 'STYLE', 'LUXE', 'FIERCE'];
const MAX_LEVELS = 50;

// Helper to calculate speed based on level
const calculateSpeed = (level: number) => {
    // Cap scaling at level 50
    const effectiveLevel = Math.min(level, MAX_LEVELS);
    // Base speed + 5% increase per level
    return RUN_SPEED_BASE + ((effectiveLevel - 1) * (RUN_SPEED_BASE * 0.05));
};

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  score: 0,
  lives: 5,
  maxLives: 5,
  speed: 0,
  collectedLetters: [],
  targetWord: FIRST_WORD.split(''),
  level: 1,
  laneCount: 3,
  itemsCollected: 0,
  distance: 0,
  
  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,

  // FULL RESET: Used when starting from the Main Menu
  startGame: () => set({ 
    status: GameStatus.PLAYING, 
    score: 0, 
    lives: 5, 
    maxLives: 5,
    speed: RUN_SPEED_BASE,
    collectedLetters: [],
    targetWord: FIRST_WORD.split(''),
    level: 1,
    laneCount: 3,
    itemsCollected: 0,
    distance: 0,
    hasDoubleJump: false,
    hasImmortality: false,
    isImmortalityActive: false
  }),

  // CHECKPOINT RESET: Used when retrying a level after Game Over
  // Preserves Level, Score, Inventory, Target Word
  restartGame: () => {
    const { level, maxLives } = get();
    
    set({ 
        status: GameStatus.PLAYING,
        lives: maxLives, // Refill lives
        distance: 0, // Reset distance for this run
        collectedLetters: [], // Reset progress on the specific word
        isImmortalityActive: false,
        speed: calculateSpeed(level), // Restore speed appropriate for this level
        // Note: We do NOT reset score, itemsCollected, laneCount, or targetWord
    });
  },

  takeDamage: () => {
    const { lives, isImmortalityActive } = get();
    if (isImmortalityActive) return; // No damage if skill is active

    if (lives > 1) {
      set({ lives: lives - 1 });
    } else {
      set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0 });
    }
  },

  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  
  collectItem: (value) => set((state) => ({ 
    score: state.score + value, 
    itemsCollected: state.itemsCollected + 1 
  })),

  setDistance: (dist) => set({ distance: dist }),

  collectLetter: (index) => {
    const { collectedLetters, speed, targetWord } = get();
    
    if (!collectedLetters.includes(index)) {
      const newLetters = [...collectedLetters, index];
      
      // Slight linear speed increase within the level to build tension
      const nextSpeed = speed + 0.5;

      set({ 
        collectedLetters: newLetters,
        speed: nextSpeed
      });

      // Check if full word collected
      if (newLetters.length === targetWord.length) {
         get().advanceLevel();
      }
    }
  },

  advanceLevel: () => {
      const { level, laneCount } = get();
      
      // If we reached level 50, we can loop 50 or just stay there. 
      // We'll increment the number for prestige but cap difficulty in calculateSpeed.
      const nextLevel = level + 1;
      
      // Pick a random word from pool
      const nextWordStr = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];

      // Lane expansion mechanics (Every 5 levels, up to 9 lanes)
      let nextLaneCount = laneCount;
      if (nextLevel % 5 === 0 && laneCount < 9) {
          nextLaneCount += 2;
      }

      set({
          level: nextLevel,
          targetWord: nextWordStr.split(''),
          laneCount: nextLaneCount,
          status: GameStatus.PLAYING, 
          speed: calculateSpeed(nextLevel),
          collectedLetters: [] // Reset letters for the new word
      });
  },

  openShop: () => set({ status: GameStatus.SHOP }),
  
  closeShop: () => set({ status: GameStatus.PLAYING }),

  buyItem: (type, cost) => {
      const { score, maxLives, lives } = get();
      
      if (score >= cost) {
          set({ score: score - cost });
          
          switch (type) {
              case 'DOUBLE_JUMP':
                  set({ hasDoubleJump: true });
                  break;
              case 'MAX_LIFE':
                  set({ maxLives: maxLives + 1, lives: lives + 1 });
                  break;
              case 'HEAL':
                  set({ lives: Math.min(lives + 1, maxLives) });
                  break;
              case 'IMMORTAL':
                  set({ hasImmortality: true });
                  break;
          }
          return true;
      }
      return false;
  },

  activateImmortality: () => {
      const { hasImmortality, isImmortalityActive } = get();
      if (hasImmortality && !isImmortalityActive) {
          set({ isImmortalityActive: true });
          
          // Lasts 5 seconds
          setTimeout(() => {
              set({ isImmortalityActive: false });
          }, 5000);
      }
  },

  setStatus: (status) => set({ status }),
}));
