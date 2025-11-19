# Glam Surfer 💅✨

> A high-speed, sassy, cyber-pop infinite runner built with React, Three.js, and Zustand.

Race through a neon cosmos, collect makeup, spell sassy words, and slay the runway while dodging glitch drones and barriers.

## 🎮 How to Play

**Goal:** Run as far as you can, collect letters to spell the target word (e.g., "SASSY", "QUEEN"), and build your "Stash" (score).

### Controls
| Action | Keyboard | Touch |
|--------|----------|-------|
| **Move Left/Right** | `Arrow Left` / `Arrow Right` or `A` / `D` | Swipe Left / Right |
| **Jump** | `Arrow Up` / `W` or `Space` | Swipe Up |
| **Double Jump** | Press Jump in mid-air (Buy from Shop) | Swipe Up in mid-air |
| **Queen Mode** | `Enter` (If ability purchased) | Tap Center |

## 🏗️ Architecture Flowchart

graph TD
    subgraph "Game State (Zustand Store)"
        Store[store.ts] -- Holds --> Score
        Store -- Holds --> GameStatus(Menu/Playing/Shop)
        Store -- Holds --> Speed & LaneCount
        Store -- Holds --> Level & TargetWord
    end

    subgraph "Main Loop (App.tsx)"
        Canvas[Three.js Canvas]
        Loop[Render Loop (60fps)]
    end

    subgraph "World Components"
        Player[Player.tsx] -- Reads Input --> Store
        Player -- Updates Pos --> Visuals
        
        LevelMgr[LevelManager.tsx] -- Spawns --> Objects(Letters/Makeup/Obstacles)
        LevelMgr -- Checks Collisions --> Store
        
        Env[Environment.tsx] -- Renders --> Sun/Stars/Grid
    end

    subgraph "UI Layer"
        HUD[HUD.tsx] -- Displays --> Score/Lives/Words
        HUD -- Triggers --> Shop/Restart
    end

    Store -->|State Updates| HUD
    Store -->|Speed/Level| LevelMgr
    Loop -->|Delta Time| Player
    Loop -->|Delta Time| LevelMgr
    
    Player -->|Collision Event| LevelMgr
    LevelMgr -->|Collect/Damage| Store
```

## 📂 Project Structure

*   **`store.ts`**: The brain of the game. Manages score, logic, level progression, and shop mechanics.
*   **`components/World/`**:
    *   `Player.tsx`: The 3D character model (Geometry, Animations, Physics).
    *   `LevelManager.tsx`: Handles spawning obstacles, makeup items, and collision detection.
    *   `Environment.tsx`: The vaporwave sun, scrolling grid, and starfield.
*   **`components/UI/`**:
    *   `HUD.tsx`: 2D Overlay for score, shop interface, and game over screens.
*   **`components/System/`**:
    *   `Audio.ts`: Synthesized sound effects (Oscillators) to avoid external asset dependencies.

## 🎨 Customization

To change the aesthetics:
1.  **Colors:** Edit `GLAM_COLORS` in `types.ts`.
2.  **Words:** Update `WORD_POOL` in `store.ts`.
3.  **Models:** Modify geometry primitives in `LevelManager.tsx` or `Player.tsx`.
