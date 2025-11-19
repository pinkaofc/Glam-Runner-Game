
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Heart, Zap, Trophy, Sparkles, Crown, Briefcase } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus, GLAM_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';

// Available Shop Items
const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'DOUBLE_JUMP',
        name: 'HIGH HEELS HOP',
        description: 'Jump again in mid-air. Reach for the stars!',
        cost: 1000,
        icon: Sparkles,
        oneTime: true
    },
    {
        id: 'MAX_LIFE',
        name: 'EXTRA GLOW',
        description: 'Permanently adds a heart slot. Stay shining.',
        cost: 1500,
        icon: Heart
    },
    {
        id: 'HEAL',
        name: 'TOUCH UP',
        description: 'Restores 1 Life point instantly.',
        cost: 1000,
        icon: Sparkles
    },
    {
        id: 'IMMORTAL',
        name: 'QUEEN ENERGY',
        description: 'Unlock Ability: Press Space to be invincible for 5s.',
        cost: 3000,
        icon: Crown,
        oneTime: true
    }
];

const ShopScreen: React.FC = () => {
    const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
    const [items, setItems] = useState<ShopItem[]>([]);

    useEffect(() => {
        // Select 3 random items
        let pool = SHOP_ITEMS.filter(item => {
            if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
            if (item.id === 'IMMORTAL' && hasImmortality) return false;
            return true;
        });

        pool = pool.sort(() => 0.5 - Math.random());
        setItems(pool.slice(0, 3));
    }, []);

    return (
        <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
             <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                 <h2 className="text-3xl md:text-5xl font-black text-cyan-400 mb-2 font-cyber tracking-widest text-center drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">GLAM SHOP</h2>
                 <div className="flex items-center text-lime-400 mb-6 md:mb-8">
                     <span className="text-base md:text-lg mr-2">STASH:</span>
                     <span className="text-xl md:text-2xl font-bold">{score.toLocaleString()} POINTS</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full mb-8">
                     {items.map(item => {
                         const Icon = item.icon;
                         const canAfford = score >= item.cost;
                         return (
                             <div key={item.id} className="bg-gray-900 border-2 border-lime-500/50 p-4 md:p-6 rounded-xl flex flex-col items-center text-center hover:border-lime-300 transition-all shadow-[0_0_15px_rgba(200,255,0,0.2)]">
                                 <div className="bg-pink-500/20 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                                     <Icon className="w-6 h-6 md:w-8 md:h-8 text-pink-400" />
                                 </div>
                                 <h3 className="text-lg md:text-xl font-bold mb-2 text-lime-100">{item.name}</h3>
                                 <p className="text-gray-300 text-xs md:text-sm mb-4 h-10 md:h-12 flex items-center justify-center">{item.description}</p>
                                 <button 
                                    onClick={() => buyItem(item.id as any, item.cost)}
                                    disabled={!canAfford}
                                    className={`px-4 md:px-6 py-2 rounded-full font-bold w-full text-sm md:text-base transition-all ${canAfford ? 'bg-gradient-to-r from-lime-500 to-green-600 hover:scale-105 shadow-lg text-black' : 'bg-gray-700 cursor-not-allowed opacity-50'}`}
                                 >
                                     BUY FOR {item.cost}
                                 </button>
                             </div>
                         );
                     })}
                 </div>

                 <button 
                    onClick={closeShop}
                    className="flex items-center px-8 md:px-12 py-3 md:py-4 bg-white text-black font-black text-lg md:text-xl rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                 >
                     KEEP SLAYING
                 </button>
             </div>
        </div>
    );
};

export const HUD: React.FC = () => {
  const { score, lives, maxLives, collectedLetters, status, level, restartGame, startGame, itemsCollected, distance, isImmortalityActive, speed, targetWord } = useStore();

  const containerClass = "absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50";

  if (status === GameStatus.SHOP) {
      return <ShopScreen />;
  }

  if (status === GameStatus.MENU) {
      return (
          <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
              <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,255,255,0.4)] border-2 border-lime-500 animate-in zoom-in-95 duration-500">
                
                <div className="relative w-full bg-black h-[500px] flex flex-col items-center justify-center overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-black opacity-90"></div>
                     
                     {/* Decorative shapes */}
                     <div className="absolute top-10 right-10 w-32 h-32 bg-lime-500 blur-[60px] rounded-full opacity-60 animate-pulse"></div>
                     <div className="absolute bottom-10 left-10 w-40 h-40 bg-pink-500 blur-[60px] rounded-full opacity-40"></div>

                     <Crown className="w-24 h-24 text-yellow-300 mb-4 animate-bounce drop-shadow-[0_0_15px_gold]" />
                     <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 font-cyber tracking-tighter z-10 drop-shadow-lg text-center">
                         GLAM<br/>SURFER
                     </h1>

                     <div className="absolute inset-0 flex flex-col justify-end items-center p-6 pb-12 z-10 w-full">
                        <button 
                          onClick={() => { audio.init(); startGame(); }}
                          className="w-full group relative px-6 py-4 bg-lime-500 text-black font-black text-xl rounded-2xl hover:bg-lime-400 transition-all shadow-[0_0_20px_rgba(200,255,0,0.5)] overflow-hidden"
                        >
                            <span className="relative z-10 tracking-widest flex items-center justify-center">
                                START RUN <Sparkles className="ml-2 w-5 h-5" />
                            </span>
                        </button>
                     </div>
                </div>
              </div>
          </div>
      );
  }

  if (status === GameStatus.GAME_OVER) {
      return (
          <div className="absolute inset-0 bg-black/95 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
              <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <h1 className="text-4xl md:text-7xl font-black text-pink-500 mb-2 drop-shadow-[0_0_10px_#ff00cc] font-cyber text-center">GAME OVER</h1>
                <p className="text-cyan-400 font-mono mb-8 tracking-wider">DONT GIVE UP QUEEN!</p>
                
                <div className="grid grid-cols-1 gap-3 md:gap-4 text-center mb-8 w-full max-w-md">
                    <div className="bg-gray-900 p-3 md:p-4 rounded-lg border border-lime-500 flex items-center justify-between">
                        <div className="flex items-center text-lime-400 text-sm md:text-base"><Trophy className="mr-2 w-4 h-4 md:w-5 md:h-5"/> LEVEL</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{level}</div>
                    </div>
                    <div className="bg-gray-900 p-3 md:p-4 rounded-lg border border-pink-500 flex items-center justify-between">
                        <div className="flex items-center text-pink-400 text-sm md:text-base"><Briefcase className="mr-2 w-4 h-4 md:w-5 md:h-5"/> STASH</div>
                        <div className="text-xl md:text-2xl font-bold font-mono">{itemsCollected}</div>
                    </div>
                     <div className="bg-gradient-to-r from-cyan-900/50 to-purple-900/50 p-3 md:p-4 rounded-lg flex items-center justify-between mt-2 border border-white/10">
                        <div className="flex items-center text-white text-sm md:text-base">SCORE</div>
                        <div className="text-2xl md:text-3xl font-bold font-cyber text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-500">{score.toLocaleString()}</div>
                    </div>
                </div>

                <div className="flex flex-col space-y-4 w-full max-w-md">
                    <button 
                    onClick={() => { audio.init(); restartGame(); }}
                    className="w-full px-8 md:px-12 py-3 md:py-4 bg-lime-500 text-black font-bold text-lg md:text-xl rounded-full hover:scale-105 transition-all shadow-[0_0_25px_rgba(200,255,0,0.5)]"
                    >
                        RETRY LEVEL {level}
                    </button>
                    
                    <button 
                    onClick={() => { audio.init(); startGame(); }}
                    className="w-full px-6 py-3 bg-transparent border-2 border-gray-600 text-gray-400 font-bold text-sm rounded-full hover:border-white hover:text-white transition-all"
                    >
                        MAIN MENU (RESET)
                    </button>
                </div>
              </div>
          </div>
      );
  }

  if (status === GameStatus.VICTORY) {
    return (
        <div className="absolute inset-0 bg-black/95 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
            <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <Crown className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 mb-4 animate-bounce drop-shadow-[0_0_25px_rgba(255,215,0,0.8)]" />
                <h1 className="text-4xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-cyan-400 to-pink-400 mb-2 drop-shadow-[0_0_30px_rgba(0,255,255,0.6)] font-cyber text-center leading-tight">
                    YOU SLAYED IT
                </h1>
                
                <div className="bg-gray-900 p-8 rounded-2xl border border-cyan-500/40 shadow-[0_0_30px_rgba(0,255,255,0.2)] mb-8">
                    <div className="text-xs md:text-sm text-cyan-300 mb-1 tracking-widest text-center">FINAL SCORE</div>
                    <div className="text-4xl md:text-6xl font-bold font-cyber text-white drop-shadow-lg text-center">{score.toLocaleString()}</div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 md:px-12 py-4 md:py-5 bg-white text-black font-black text-lg md:text-xl rounded-full hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.4)] tracking-widest"
                >
                    NEXT RUNWAY
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className={containerClass}>
        {/* Top Bar */}
        <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
                <div className="text-3xl md:text-5xl font-bold text-lime-400 drop-shadow-[0_0_5px_#ccff00] font-cyber">
                    {score.toLocaleString()}
                </div>
                <div className="text-xs md:text-sm text-cyan-300 font-mono tracking-wider mt-1">STASH: {itemsCollected}</div>
            </div>
            
            <div className="flex space-x-1 md:space-x-2">
                {[...Array(maxLives)].map((_, i) => (
                    <Heart 
                        key={i} 
                        className={`w-6 h-6 md:w-8 md:h-8 ${i < lives ? 'text-pink-500 fill-pink-500' : 'text-gray-800 fill-gray-800'} drop-shadow-[0_0_5px_#ff00cc]`} 
                    />
                ))}
            </div>
        </div>
        
        {/* Level Indicator */}
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-sm md:text-lg text-black font-bold tracking-wider font-mono bg-lime-400 px-4 py-1 rounded-sm border-2 border-white shadow-[0_0_10px_rgba(200,255,0,0.5)] z-50 skew-x-[-10deg]">
            LEVEL {level} / 50
        </div>

        {/* Active Skill Indicator */}
        {isImmortalityActive && (
             <div className="absolute top-24 left-1/2 transform -translate-x-1/2 text-yellow-300 font-bold text-xl md:text-2xl animate-pulse flex items-center drop-shadow-[0_0_15px_gold]">
                 <Crown className="mr-2 fill-yellow-300" /> QUEEN MODE
             </div>
        )}

        {/* Letter Collection Status */}
        <div className="absolute top-16 md:top-24 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-3">
            {targetWord.map((char, idx) => {
                const isCollected = collectedLetters.includes(idx);
                // Cycle through the glam colors for the letters
                const color = GLAM_COLORS[idx % GLAM_COLORS.length];

                return (
                    <div 
                        key={idx}
                        style={{
                            borderColor: isCollected ? color : 'rgba(255, 255, 255, 0.2)',
                            color: isCollected ? '#000' : 'rgba(255, 255, 255, 0.2)',
                            boxShadow: isCollected ? `0 0 20px ${color}` : 'none',
                            backgroundColor: isCollected ? color : 'rgba(0, 0, 0, 0.6)'
                        }}
                        className={`w-8 h-10 md:w-10 md:h-12 flex items-center justify-center border-2 font-black text-lg md:text-xl font-cyber rounded-sm skew-x-[-5deg] transform transition-all duration-300`}
                    >
                        {char}
                    </div>
                );
            })}
        </div>

        {/* Bottom Overlay */}
        <div className="w-full flex justify-end items-end">
             <div className="flex items-center space-x-2 text-cyan-400 opacity-90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-cyan-500/30">
                 <Zap className="w-4 h-4 md:w-6 md:h-6 animate-pulse fill-cyan-400" />
                 <span className="font-mono text-base md:text-xl">SPEED {Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
             </div>
        </div>
    </div>
  );
};
