import { useState, useEffect, useRef } from 'react';
import { GameBalloon } from '../types';
import { BALLOON_WISHES } from '../data';
import { Sparkles, Trophy, RotateCcw, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BalloonPopGame() {
  const [balloons, setBalloons] = useState<GameBalloon[]>([]);
  const [score, setScore] = useState(0);
  const [activeWish, setActiveWish] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Synthesis of popping sound using Web Audio API
  const playPopSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      // Fast sweeping pitch for classic "pop" sound
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  // Generate a single balloon
  const createBalloon = (id: number, index?: number): GameBalloon => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : 300;
    
    const balloonColors = [
      'radial-gradient(circle at 30% 30%, #34d399, #059669)', // Mint/Green
      'radial-gradient(circle at 30% 30%, #38bdf8, #0284c7)', // Sky/Blue
      'radial-gradient(circle at 30% 30%, #22d3ee, #0891b2)', // Turquoise/Cyan
      'radial-gradient(circle at 30% 30%, #10b981, #065f46)'  // Emerald
    ];

    const wishIndex = index !== undefined ? index : Math.floor(Math.random() * BALLOON_WISHES.length);

    return {
      id,
      x: Math.random() * (width - 60) + 10,
      y: 420, // Start below frame
      speedY: Math.random() * 1.5 + 0.8, // Float speed
      size: Math.random() * 15 + 45, // Balloon diameter
      color: balloonColors[Math.floor(Math.random() * balloonColors.length)]!,
      text: BALLOON_WISHES[wishIndex]!,
      isPopped: false
    };
  };

  // Initialize and spawn loops
  useEffect(() => {
    if (!isPlaying) return;

    // Start with 4 balloons
    const initial = Array.from({ length: 4 }).map((_, idx) => createBalloon(idx));
    setBalloons(initial);

    // Spawn new balloons periodically
    let spawnCounter = 4;
    const spawnInterval = setInterval(() => {
      setBalloons((prev) => {
        if (prev.filter((b) => !b.isPopped).length >= 6) return prev; // Limit active ones
        return [...prev, createBalloon(spawnCounter++)];
      });
    }, 1800);

    return () => clearInterval(spawnInterval);
  }, [isPlaying]);

  // Float loop simulation
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = setInterval(() => {
      setBalloons((prev) =>
        prev
          .map((b) => {
            if (b.isPopped) return b;
            return { ...b, y: b.y - b.speedY };
          })
          // Keep popped ones for a moment or remove if out of screen
          .filter((b) => b.y > -80 || b.isPopped)
      );
    }, 25);

    return () => clearInterval(gameLoop);
  }, [isPlaying]);

  const popBalloon = (id: number, text: string) => {
    playPopSound();
    
    setBalloons((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          return { ...b, isPopped: true };
        }
        return b;
      })
    );

    setScore((prev) => prev + 1);
    setActiveWish(text);

    // Auto dismiss revealed wish after 3 seconds
    setTimeout(() => {
      setActiveWish((prev) => (prev === text ? null : prev));
    }, 3000);
  };

  const restartGame = () => {
    setScore(0);
    setActiveWish(null);
    setBalloons([]);
    setIsPlaying(true);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Score Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 rounded-xl border border-emerald-500/10">
        <div className="flex items-center gap-1.5 text-emerald-300">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-sans text-xs">پکیده شده:</span>
          <span className="font-mono text-sm font-bold">{score}</span>
        </div>

        <button
          onClick={restartGame}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 transition-all cursor-pointer"
          title="بازی دوباره"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Arena Game Frame */}
      <div
        ref={containerRef}
        className="relative w-full h-[400px] bg-slate-950/80 rounded-2xl border border-sky-500/20 shadow-inner overflow-hidden cursor-crosshair flex items-center justify-center"
      >
        <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-slate-500 font-sans z-10 select-none">
          <Info className="w-3 h-3" />
          <span>روی بادکنک‌ها بزن تا بپکن!</span>
        </div>

        {/* Ambient Grid back-effect */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

        {/* Wish Popup Inside Game */}
        <AnimatePresence>
          {activeWish && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10 }}
              className="absolute z-10 px-5 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-center shadow-xl max-w-[240px] select-none"
            >
              <Sparkles className="w-4 h-4 text-amber-300 mx-auto mb-1 animate-pulse" />
              <p className="font-sans font-bold text-xs text-white leading-loose">
                آرزوی مهشید برآورده شد:
              </p>
              <p className="font-sans font-black text-sm text-amber-300 mt-1 leading-normal">
                {activeWish}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actual Balloons Rendering */}
        {balloons.map((b) => (
          <AnimatePresence key={b.id}>
            {!b.isPopped ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: b.size,
                  height: b.size * 1.2
                }}
                className="select-none flex flex-col items-center cursor-pointer group"
                onClick={() => popBalloon(b.id, b.text)}
              >
                {/* Balloon head */}
                <div
                  className="w-full h-full rounded-full relative flex items-center justify-center text-[10px] text-white font-bold shadow-md hover:scale-105 active:scale-90 transition-transform duration-100"
                  style={{
                    background: b.color,
                    boxShadow: 'inset -5px -5px 12px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Balloon reflection shine */}
                  <div className="absolute top-1.5 left-2.5 w-3 h-1.5 bg-white/40 rounded-full rotate-[-15deg]" />
                  🎈
                </div>

                {/* Balloon string knot & line */}
                <div className="w-1.5 h-1.5 bg-slate-400 rotate-45 -mt-0.5" />
                <div className="w-0.5 h-6 bg-slate-500/40" />
              </motion.div>
            ) : (
              // Sparkle Burst when Popped
              <motion.div
                key={`pop-${b.id}`}
                style={{ position: 'absolute', left: b.x + b.size / 2, top: b.y + b.size / 2 }}
                className="pointer-events-none"
              >
                {[...Array(6)].map((_, i) => {
                  const angle = (i * Math.PI) / 3;
                  const dist = 35;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                      animate={{
                        x: Math.cos(angle) * dist,
                        y: Math.sin(angle) * dist,
                        scale: 0.1,
                        opacity: 0
                      }}
                      transition={{ duration: 0.4 }}
                      className="absolute w-2 h-2 rounded-full bg-sky-300"
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        ))}

        {/* Empty status / Start screen */}
        {balloons.length === 0 && (
          <div className="text-center p-6 text-slate-500 font-sans flex flex-col items-center gap-2 select-none">
            <Sparkles className="w-8 h-8 text-sky-400 animate-pulse" />
            <span className="text-sm">در حال ساختن بادکنک‌های جادویی...</span>
          </div>
        )}
      </div>
    </div>
  );
}
