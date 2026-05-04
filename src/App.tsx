/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Play, Trophy, RotateCcw, Skull, Bomb, Info } from 'lucide-react';
import { GameStatus, GameState, Piece } from './types.ts';
import { NUMBER_SEGMENTS, COLORS, INITIAL_LIVES, GET_SPEED } from './constants.ts';

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 600;
const GROUND_Y = 450;
const NUMBER_SCALE = 1.5;
const TOLERANCE = 40; // Pixels for "perfect" hit

export default function App() {
  const [state, setState] = useState<GameState>({
    status: GameStatus.START,
    level: 1,
    lives: 3,
    score: 0,
    levelScore: 0,
    collectedIndices: [],
    currentPiece: null,
    feedback: 'none',
  });

  const [shake, setShake] = useState(false);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(null);

  const togglePause = useCallback(() => {
    setState(prev => {
      if (prev.status === GameStatus.PLAYING) {
        return { ...prev, status: GameStatus.PAUSED };
      } else if (prev.status === GameStatus.PAUSED) {
        lastTimeRef.current = performance.now(); // reset time to avoid jump
        return { ...prev, status: GameStatus.PLAYING };
      }
      return prev;
    });
  }, []);

  const spawnPiece = useCallback((level: number, collected: number[]) => {
    const segments = NUMBER_SEGMENTS[level];
    const remaining = segments
      .map((_, i) => i)
      .filter(i => !collected.includes(i));
    
    if (remaining.length === 0) return null;

    // 30% chance for a bomb at any level
    const isBomb = Math.random() < 0.30;
    
    if (isBomb) {
      return {
        id: Math.random().toString(36),
        type: 'bomb',
        pathData: '',
        index: -1,
        targetX: VIEW_WIDTH / 2,
        targetY: GROUND_Y,
        currentY: -50,
        speed: GET_SPEED(level) * 1.2,
      };
    }

    const nextIndex = remaining[Math.floor(Math.random() * remaining.length)];
    return {
      id: Math.random().toString(36),
      type: 'path',
      pathData: segments[nextIndex],
      index: nextIndex,
      targetX: VIEW_WIDTH / 2 - 50, // Centers the 100px wide number
      targetY: GROUND_Y - 150,      // Ground position
      currentY: -100,
      speed: GET_SPEED(level),
    };
  }, []);

  const resetLevel = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      level,
      lives: INITIAL_LIVES(level),
      levelScore: 0,
      collectedIndices: [],
      currentPiece: spawnPiece(level, []),
      status: GameStatus.PLAYING,
      feedback: 'none'
    }));
  }, [spawnPiece]);

  const startGame = () => {
    resetLevel(1);
    setState(prev => ({ ...prev, score: 0, levelScore: 0 }));
  };

  const exitGame = () => {
    setState(prev => ({
      ...prev,
      status: GameStatus.START
    }));
  };

  const handleAction = useCallback(() => {
    if (state.status !== GameStatus.PLAYING || !state.currentPiece) return;

    const { currentPiece, collectedIndices, level, lives } = state;
    const distance = Math.abs(currentPiece.currentY - (currentPiece.type === 'bomb' ? GROUND_Y : currentPiece.targetY));

    if (currentPiece.type === 'bomb') {
      // Any button press on a bomb detonates it, resets progress, and removes a life
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      const nextLives = lives - 1;
      if (nextLives <= 0) {
        setState(prev => ({ 
          ...prev, 
          status: GameStatus.GAME_OVER, 
          lives: 0, 
          currentPiece: null,
          score: Math.max(0, prev.score - 50),
          levelScore: Math.max(0, prev.levelScore - 50)
        }));
      } else {
        setState(prev => ({
          ...prev,
          lives: nextLives,
          collectedIndices: [],
          currentPiece: spawnPiece(level, []),
          feedback: 'fail',
          score: Math.max(0, prev.score - 50),
          levelScore: Math.max(0, prev.levelScore - 50)
        }));
      }
      return;
    }

    if (distance < TOLERANCE) {
      // SUCCESS for path piece
      
      // Calculate score based on accuracy (distance). 0 distance = 100 pts, edge of tolerance = ~50 pts.
      const accuracyMultiplier = 1 - (distance / TOLERANCE) * 0.5;
      const pointsEarned = Math.round(100 * accuracyMultiplier);
      
      const nextCollected = [...collectedIndices, currentPiece.index];
      const isLevelComplete = nextCollected.length === NUMBER_SEGMENTS[level].length;

      if (isLevelComplete) {
        if (level === 9) {
          setState(prev => ({ 
            ...prev, 
            status: GameStatus.GAME_COMPLETE, 
            score: prev.score + pointsEarned,
            levelScore: prev.levelScore + pointsEarned
          }));
        } else {
          setState(prev => ({ 
            ...prev, 
            status: GameStatus.LEVEL_WON, 
            collectedIndices: nextCollected, 
            currentPiece: null,
            score: prev.score + pointsEarned,
            levelScore: prev.levelScore + pointsEarned
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          collectedIndices: nextCollected,
          currentPiece: spawnPiece(level, nextCollected),
          feedback: 'success',
          score: prev.score + pointsEarned,
          levelScore: prev.levelScore + pointsEarned
        }));
      }
    } else {
      // FAIL - Pressed too early or too late
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      const nextLives = lives - 1;
      if (nextLives <= 0) {
        setState(prev => ({ 
          ...prev, 
          status: GameStatus.GAME_OVER, 
          lives: 0,
          score: Math.max(0, prev.score - 25),
          levelScore: Math.max(0, prev.levelScore - 25)
        }));
      } else {
        setState(prev => ({
          ...prev,
          lives: nextLives,
          currentPiece: spawnPiece(level, collectedIndices),
          feedback: 'fail',
          score: Math.max(0, prev.score - 25),
          levelScore: Math.max(0, prev.levelScore - 25)
        }));
      }
    }
  }, [state, spawnPiece]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleAction();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction, togglePause]);

  const update = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined && state.status === GameStatus.PLAYING && state.currentPiece) {
      const deltaTime = time - (lastTimeRef.current || time);
      
      setState(prev => {
        if (!prev.currentPiece) return prev;
        
        const newY = prev.currentPiece.currentY + (prev.currentPiece.speed * (deltaTime / 16.6));
        const triggerY = prev.currentPiece.type === 'bomb' ? GROUND_Y : prev.currentPiece.targetY;

        // If it falls past the screen
        if (newY > VIEW_HEIGHT) {
          if (prev.currentPiece.type === 'path') {
            // Missed path piece
            setShake(true);
            setTimeout(() => setShake(false), 500);
            const nextLives = prev.lives - 1;
            if (nextLives <= 0) {
              return { 
                ...prev, 
                status: GameStatus.GAME_OVER, 
                lives: 0, 
                currentPiece: null,
                score: Math.max(0, prev.score - 25),
                levelScore: Math.max(0, prev.levelScore - 25)
              };
            }
            return {
              ...prev,
              lives: nextLives,
              currentPiece: spawnPiece(prev.level, prev.collectedIndices),
              feedback: 'fail',
              score: Math.max(0, prev.score - 25),
              levelScore: Math.max(0, prev.levelScore - 25)
            };
          } else {
            // Bomb safely ignored
            return {
              ...prev,
              currentPiece: spawnPiece(prev.level, prev.collectedIndices),
              feedback: 'success'
            };
          }
        }

        return {
          ...prev,
          currentPiece: { ...prev.currentPiece, currentY: newY }
        };
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(update);
  }, [state.status, spawnPiece]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  return (
    <div className="w-full h-screen bg-[#050505] text-[#F5F5F5] font-sans selection:bg-blue-500 overflow-hidden relative flex flex-col">
      {/* Header Navigation */}
      <nav className="flex justify-between items-end p-6 border-b border-white/10 shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.3em] text-blue-500 font-bold mb-1">I/O 2026</span>
          <h1 className="text-4xl font-black tracking-tighter leading-none italic uppercase">GridSync</h1>
        </div>
        <div className="flex gap-12 text-right hidden md:flex">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Session Score</p>
            <p className="text-2xl font-mono leading-none tracking-tighter">{state.score.toString().padStart(6, '0')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Precision</p>
            <p className="text-2xl font-mono leading-none tracking-tighter text-blue-500">
              {state.currentPiece ? Math.max(0, 100 - Math.floor(Math.abs(state.currentPiece.currentY - (state.currentPiece.type === 'bomb' ? GROUND_Y : state.currentPiece.targetY)))).toString() : '0'}%
            </p>
          </div>
        </div>
      </nav>

      {/* Main Gameplay Viewport */}
      <main className="relative flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        
        {/* Level Indicator (Left) */}
        <div className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col justify-between h-full">
          <div className="space-y-1">
            <p className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Stage</p>
            <p className="text-[100px] lg:text-[120px] leading-[0.85] font-black italic text-blue-600 tracking-tighter select-none">
              {state.level.toString().padStart(2, '0')}
            </p>
            <p className="text-sm text-white/50 pt-2 border-t border-white/5 font-medium italic">
              {state.level === 1 ? 'The Foundation' : state.level === 9 ? 'Final Sequence' : 'Segment Propagation'}
            </p>
          </div>
          
          <div className="space-y-4 mt-auto pt-4 border-t-0">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Lives Remaining</span>
              <div className="flex gap-2">
                {[...Array(INITIAL_LIVES(state.level))].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 rounded-full transition-colors duration-300 ${i < state.lives ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/10'}`} 
                  />
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-[10px] text-white/60 mb-2 uppercase tracking-widest font-bold text-center">Target Matrix</p>
              <div className="flex justify-center items-center h-16 opacity-40">
                 <svg viewBox="0 0 100 120" className="h-full">
                    {NUMBER_SEGMENTS[state.level].map((d, i) => (
                        <path 
                            key={i} d={d} fill="none" stroke={state.collectedIndices.includes(i) ? COLORS.green : '#666'} 
                            strokeWidth="8" strokeLinecap="round" 
                        />
                    ))}
                 </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Center Stage (Perspective Render) */}
        <div className={`col-span-12 md:col-span-6 relative flex items-center justify-center bg-radial-at-t from-blue-900/10 to-transparent ${shake ? 'animate-shake' : ''}`}>
          
          {/* Game Viewport Layer (SVG) */}
          <div className="relative w-full aspect-[4/5] max-h-full">
            <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="absolute inset-0 w-full h-full">
                {/* Perspective Ground Grid */}
                <g transform={`translate(0, ${GROUND_Y}) scale(1, 0.4)`}>
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1"/>
                        </pattern>
                    </defs>
                    <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#grid)" />
                </g>

                {/* Perspective Ground Highlight */}
                <path 
                    d={`M 0 ${GROUND_Y} L ${VIEW_WIDTH} ${GROUND_Y} L ${VIEW_WIDTH} ${VIEW_HEIGHT} L 0 ${VIEW_HEIGHT} Z`}
                    fill="url(#groundGradient)"
                    opacity="0.2"
                />
                <defs>
                    <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={COLORS.blue} stopOpacity="0.3" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>

                {/* Target Number Blueprint */}
                <g transform={`translate(${VIEW_WIDTH/2 - 50}, ${GROUND_Y - 150}) skewX(-10) scale(1, 0.9)`}>
                    {NUMBER_SEGMENTS[state.level].map((d, i) => (
                        <path 
                            key={i}
                            d={d}
                            fill="none"
                            stroke={state.collectedIndices.includes(i) ? COLORS.green : 'rgba(255,255,255,0.1)'}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={state.collectedIndices.includes(i) ? 'drop-shadow-[0_0_15px_rgba(52,168,83,0.9)]' : ''}
                        />
                    ))}
                </g>

                {/* Falling Piece */}
                <AnimatePresence>
                    {state.currentPiece && (
                        <g transform={`translate(${state.currentPiece.targetX}, ${state.currentPiece.currentY}) ${state.currentPiece.type === 'path' ? 'skewX(-10) scale(1, 0.9)' : ''}`}>
                            {state.currentPiece.type === 'bomb' ? (
                                <foreignObject x={-25} y={-25} width={50} height={50}>
                                    <div className="flex items-center justify-center w-full h-full text-red-500 animate-pulse">
                                        <Bomb size={40} strokeWidth={3} />
                                    </div>
                                </foreignObject>
                            ) : (
                                <>
                                    <path 
                                        d={state.currentPiece.pathData}
                                        fill="none"
                                        stroke={COLORS.blue}
                                        strokeWidth="14"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]"
                                    />
                                </>
                            )}
                        </g>
                    )}
                </AnimatePresence>
            </svg>
          </div>

          {/* Control Prompt */}
          {state.status === GameStatus.PLAYING && (
            <div className="absolute bottom-16 flex flex-col items-center gap-2">
                <div className="w-[260px] text-center py-2 border border-white/10 text-white/60 font-bold uppercase tracking-[0.1em] text-[11px] bg-black/20 backdrop-blur-sm">
                Press [ SPACE/ENTER ] to Sync
                </div>
                <div className="w-[260px] text-center py-2 border border-white/10 text-white/60 font-bold uppercase tracking-[0.1em] text-[11px] bg-black/20 backdrop-blur-sm">
                Press [ ESC ] to Pause
                </div>
            </div>
          )}
        </div>

        {/* Precision Meter (Right) */}
        <div className="col-span-12 md:col-span-3 border-t md:border-t-0 md:border-l border-white/10 p-4 md:p-6 flex flex-col justify-between items-center h-full">
          <div className="text-center w-full flex-1 flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 font-bold shrink-0">Sync Meter</p>
            <div className="relative w-16 min-h-[200px] flex-1 max-h-[300px] bg-white/5 rounded-full p-2 flex flex-col items-center border border-white/10 mx-auto">
              <div className="w-full flex-1 flex flex-col justify-center items-center relative gap-4">
                 {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-full h-[1px] bg-white/10"></div>
                 ))}
                 
                 <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${state.currentPiece?.type === 'bomb' ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="w-14 h-14 rounded-full border-2 border-white/5 bg-white/5 flex items-center justify-center mb-4">
                        <div className={`w-12 h-12 rounded-full border-2 transition-all duration-150 ${state.currentPiece && state.currentPiece.type !== 'bomb' && Math.abs(state.currentPiece.currentY - state.currentPiece.targetY) < TOLERANCE ? 'border-green-500 bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-white/10'}`}>
                            {state.currentPiece && state.currentPiece.type !== 'bomb' && Math.abs(state.currentPiece.currentY - state.currentPiece.targetY) < TOLERANCE && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-[10px] font-black text-green-500">SYNC</span>
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
              </div>

              {/* Meter Bar Indicator */}
              {state.currentPiece && (
                <motion.div 
                    className="absolute w-10 h-1 bg-white shadow-[0_0_10px_white] z-10 rounded-full"
                    style={{ top: `${(state.currentPiece.currentY / VIEW_HEIGHT) * 100}%` }}
                />
              )}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 mt-6 shrink-0">
            <div className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-white/60 tracking-tight mb-2">Score Guideline</p>
              <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>Perfect Hit</span><span className="text-green-400">+100</span></div>
              <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>Good Hit</span><span className="text-blue-400">+50~99</span></div>
              <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>Miss / Early</span><span className="text-red-400">-25</span></div>
              <div className="flex justify-between text-[10px] text-white/40"><span>Bomb Hit</span><span className="text-red-500 font-bold">-50</span></div>
            </div>

            <div className="w-full p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center font-black text-black shrink-0">
                 <Bomb size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-red-500 tracking-tight">System Hazard</p>
                <p className="text-[10px] text-white/40 italic leading-snug">Pressing any key detonates the bomb</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="p-4 border-t border-white/10 flex justify-between items-center bg-[#0a0a0a] font-mono shrink-0 relative">
        <div className="flex gap-8 items-center z-10">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] text-white/30 uppercase">Level Score</span>
            <span className="text-lg font-bold">{state.levelScore.toLocaleString()}</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
          <div className="flex items-baseline gap-2 hidden sm:flex">
            <span className="text-[10px] text-white/30 uppercase">Vector Speed</span>
            <span className="text-lg font-bold text-yellow-500">{GET_SPEED(state.level).toFixed(1)}x</span>
          </div>
        </div>

        {state.status !== GameStatus.START && (
          <div className="absolute left-1/2 -translate-x-1/2 z-10 hidden sm:block">
             <button 
                onClick={exitGame}
                className="px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 transition-colors duration-300 text-[10px] uppercase tracking-widest font-bold"
             >
               Exit Game
             </button>
          </div>
        )}

        <div className="text-[9px] text-white/20 tracking-tighter uppercase font-medium z-10 hidden md:block">
          Google I/O 2026 // Experimental Build // E. Savasci
        </div>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {state.status === GameStatus.PAUSED && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-50"
            >
                <div className="max-w-md">
                    <span className="text-blue-500 font-bold tracking-[0.5em] uppercase text-xs mb-4 block">System Suspended</span>
                    <h2 className="text-6xl font-black italic mb-12 tracking-tighter text-white leading-none">PAUSED</h2>
                    
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={togglePause}
                        className="bg-white text-black px-12 py-5 rounded-full font-black text-xl italic hover:bg-blue-500 hover:text-white transition-colors duration-300 shadow-2xl flex items-center justify-center gap-4 mx-auto"
                    >
                        RESUME SESSION <Play size={20} fill="currentColor" />
                    </motion.button>
                </div>
            </motion.div>
        )}
        {state.status === GameStatus.START && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-50"
            >
                <div className="max-w-md">
                    <span className="text-blue-500 font-bold tracking-[0.5em] uppercase text-xs mb-4 block">Version 1.1.0</span>
                    <h1 className="text-7xl font-black italic mb-6 tracking-tighter text-white leading-none">GridSync<br/><span className="text-blue-600 font-mono not-italic text-5xl">Number Assembly</span></h1>
                    
                    <div className="grid grid-cols-2 gap-4 mb-12 text-left">
                        <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                            <Info size={16} className="text-blue-500 mb-2" />
                            <p className="text-[10px] leading-relaxed text-white/60 font-bold uppercase tracking-widest mb-1 text-blue-400">Objective</p>
                            <p className="text-[11px] text-white/40">Reconstruct the countdown numbers by syncing falling segments with their target matrix.</p>
                        </div>
                        <div className="bg-white/5 p-4 border border-white/10 rounded-xl">
                            <Play size={16} className="text-green-500 mb-2" />
                            <p className="text-[10px] leading-relaxed text-white/60 font-bold uppercase tracking-widest mb-1 text-green-400">Interface</p>
                            <p className="text-[11px] text-white/40">Watch the precision meter. Press SPACE or ENTER when the segment aligns within the SYNC zone.</p>
                        </div>
                    </div>

                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startGame}
                        className="bg-white text-black px-12 py-5 rounded-full font-black text-xl italic hover:bg-blue-500 hover:text-white transition-colors duration-300 shadow-2xl flex items-center justify-center gap-4 mx-auto"
                    >
                        INITIALIZE STAGE <Play size={20} fill="currentColor" />
                    </motion.button>
                </div>
            </motion.div>
        )}

        {state.status === GameStatus.LEVEL_WON && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-blue-600/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 z-50"
            >
                <Trophy size={100} className="mb-6 drop-shadow-2xl text-white outline-none" />
                <h2 className="text-6xl font-black mb-2 italic tracking-tighter">SYNC SUCCESSFUL</h2>
                <p className="text-xl font-mono uppercase tracking-[0.3em] opacity-80 mb-12">Digit {state.level} Matrix Stabilized</p>
                <button 
                    onClick={() => resetLevel(state.level + 1)}
                    className="bg-white text-blue-600 px-12 py-5 rounded-full font-black text-2xl italic shadow-2xl hover:scale-110 active:scale-95 transition-transform"
                >
                    ADVANCE TO STAGE {state.level + 1}
                </button>
            </motion.div>
        )}

        {state.status === GameStatus.GAME_OVER && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-red-600/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 z-50"
            >
                <Skull size={100} className="mb-6 text-white" />
                <h2 className="text-6xl font-black mb-4 italic tracking-tighter text-white">SYSTEM FAILURE</h2>
                <p className="text-xl font-mono uppercase tracking-[0.3em] text-white/70 mb-12">Integrity Reached Critical Threshold</p>
                
                <div className="mb-12 p-8 bg-black/40 rounded-3xl backdrop-blur-md border border-white/10 w-full max-w-xs">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">Final Score</p>
                    <p className="text-6xl font-black font-mono text-white tracking-widest">{state.score}</p>
                </div>

                <button 
                    onClick={startGame}
                    className="bg-white text-red-600 px-12 py-5 rounded-full font-black text-2xl italic shadow-2xl flex items-center gap-4 hover:scale-110 active:scale-95 transition-transform"
                >
                    <RotateCcw size={28} /> HOT REBOOT
                </button>
            </motion.div>
        )}

        {state.status === GameStatus.GAME_COMPLETE && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-white flex flex-col items-center justify-center text-center p-8 z-50"
            >
                <div className="relative">
                    <Trophy size={140} className="mb-8 text-blue-600 drop-shadow-2xl animate-bounce" />
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white font-black italic -rotate-12 outline outline-8 outline-white">
                        LEGEND
                    </div>
                </div>
                <h2 className="text-7xl font-black mb-4 italic tracking-tighter text-black leading-none text-blue-600">GAME<br/>COMPLETE</h2>
                <p className="text-xl font-mono uppercase tracking-[0.2em] text-black/60 mb-12">Matrix Fully Assembled</p>
                
                <div className="mb-12 p-10 bg-black/5 rounded-[3rem] border-4 border-black w-full max-w-sm">
                    <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-50">Final Statistics</p>
                    <p className="text-7xl font-black text-black">{state.score.toLocaleString()}</p>
                </div>

                <button 
                    onClick={startGame}
                    className="bg-blue-600 text-white px-16 py-6 rounded-full font-black text-3xl italic shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                >
                    REPLAY MATRIX
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .bg-radial-at-t {
          background: radial-gradient(circle at top, var(--tw-gradient-from), var(--tw-gradient-to));
        }
      `}</style>
    </div>
  );
}
