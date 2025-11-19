/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum ObjectType {
  OBSTACLE = 'OBSTACLE',
  ITEM = 'ITEM', // Replaced GEM with ITEM to support makeup
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN',
  MISSILE = 'MISSILE'
}

export enum MakeupVariant {
  LIPSTICK = 'LIPSTICK',
  PERFUME = 'PERFUME',
  COMPACT = 'COMPACT'
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  value?: string; // For letters
  color?: string;
  targetIndex?: number; // Index in the target word
  points?: number; 
  hasFired?: boolean; // For Aliens
  variant?: MakeupVariant; // For makeup items
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any;
    oneTime?: boolean;
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6; // seconds
export const RUN_SPEED_BASE = 22.5;
export const SPAWN_DISTANCE = 120;
export const REMOVE_DISTANCE = 20; // Behind player

// High Contrast "Cyber-Pop" Palette
// Contradicting colors: Pink vs Lime, Purple vs Yellow/Cyan
export const GLAM_COLORS = [
    '#ff00cc', // Hot Pink
    '#ccff00', // Electric Lime (Contrasts Pink)
    '#00ffff', // Cyan (Contrasts Pink/Red)
    '#ff3300', // Bright Red/Orange
    '#7d26cd', // Deep Purple
    '#ffff00', // Bright Yellow
    '#ffffff', // White
];