import { useState } from 'react';
import { Sparkles, Wind, FlameKindling, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveCakeProps {
  onBlowAll: () => void;
}

export default function InteractiveCake({ onBlowAll }: InteractiveCakeProps) {
  // State of individual candles: true = lit, false = blown out
  const [candles, setCandles] = useState<boolean[]>([true, true, true, true, true]);
  const [isBlowing, setIsBlowing] = useState(false);

  // Sound generator using Web Audio API for a perfect wind sound effect!
  const playBlowSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Noise buffer for wind
      const bufferSize = ctx.sampleRate * 0.4; // 0.4 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // White noise fill
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      // Bandpass filter to make it sound like wind blowing
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
      filter.Q.setValueAtTime(3.0, ctx.currentTime);
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      noiseNode.start();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  };

  const blowCandle = (index: number) => {
    if (!candles[index]) return; // already blown out
    playBlowSound();
    
    setCandles((prev) => {
      const next = [...prev];
      next[index] = false;
      
      // If this was the last candle blown out individually, trigger overall celebration!
      if (next.every((c) => !c)) {
        setTimeout(() => {
          onBlowAll();
        }, 400);
      }
      return next;
    });
  };

  const handleBlowAll = () => {
    setIsBlowing(true);
    playBlowSound();
    
    // Animate blowout
    setTimeout(() => {
      setCandles([false, false, false, false, false]);
      onBlowAll();
      setIsBlowing(false);
    }, 600);
  };

  const relightCandles = () => {
    setCandles([true, true, true, true, true]);
  };

  const litCount = candles.filter(Boolean).length;

  return (
    <div className="flex flex-col items-center py-6 px-4 rounded-2xl glass-card border-emerald-500/10 shadow-xl max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4 text-xs text-sky-300 font-sans opacity-85">
        <Info className="w-3.5 h-3.5" />
        <span>روی شعله‌ی شمع‌ها کلیک کنید تا خاموش بشن!</span>
      </div>

      {/* Cake Stage */}
      <div className="relative w-64 h-64 flex flex-col justify-end items-center select-none pb-4">
        
        {/* CANDLES ROW */}
        <div className="absolute bottom-[115px] z-10 flex gap-4 justify-center items-end w-full px-4">
          {candles.map((isLit, idx) => (
            <div
              key={idx}
              onClick={() => blowCandle(idx)}
              className="relative flex flex-col items-center cursor-pointer group"
              style={{
                transform: `translateY(${Math.sin((idx * Math.PI) / 4) * -3}px) rotate(${(idx - 2) * 2}deg)`
              }}
            >
              {/* Flame */}
              <AnimatePresence>
                {isLit ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0, y: -15, filter: 'blur(4px)' }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="absolute -top-7 w-3 h-7 bg-gradient-to-t from-emerald-400 via-teal-300 to-sky-100 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                    style={{
                      transformOrigin: 'bottom center',
                      animationDuration: `${0.8 + idx * 0.15}s`
                    }}
                  >
                    {/* Inner flame core */}
                    <div className="w-1.5 h-4 bg-white rounded-full mx-auto mt-2 opacity-90" />
                  </motion.div>
                ) : (
                  // Smoke puff animation
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: -5 }}
                    animate={{ opacity: [0.8, 0], scale: [1, 1.8], y: -25 }}
                    transition={{ duration: 1 }}
                    className="absolute -top-8 w-4 h-4 rounded-full bg-slate-400/50 blur-xs pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Candle Body (Dual Color Emerald and Sky Blue) */}
              <div
                className={`w-3.5 h-12 rounded-t-sm shadow-md transition-all ${
                  idx % 2 === 0
                    ? 'bg-gradient-to-b from-emerald-400 to-teal-600'
                    : 'bg-gradient-to-b from-sky-300 to-blue-500'
                } ${isLit ? 'group-hover:brightness-110' : 'brightness-50'}`}
              >
                {/* Spiral Stripes decoration */}
                <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_50%,transparent_50%,transparent_75%,#fff_75%)] bg-[length:10px_10px]" />
              </div>
            </div>
          ))}
        </div>

        {/* TOP TIER (طبقه بالا) - Emerald Green / Teal */}
        <div className="relative w-36 h-16 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-xl z-2 flex flex-col justify-end shadow-md overflow-hidden border-t border-emerald-300/30">
          {/* Frosting Drips Top Tier */}
          <div className="absolute top-0 left-0 right-0 h-4 flex justify-between z-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-gradient-to-b from-sky-200 to-sky-300/90 -mt-2"
                style={{
                  transform: `scaleY(${1 + (i % 3) * 0.25})`
                }}
              />
            ))}
          </div>

          {/* Drips cover border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-200 z-3" />

          {/* Side stars */}
          <div className="flex justify-around items-center h-full px-2">
            <Sparkles className="w-3 h-3 text-emerald-100 opacity-60 animate-bounce" />
            <Sparkles className="w-3.5 h-3.5 text-white opacity-80 animate-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-emerald-100 opacity-60 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>

        {/* BOTTOM TIER (طبقه پایین) - Deep Forest Green / Night Teal */}
        <div className="relative w-52 h-20 bg-gradient-to-r from-teal-800 to-slate-900 rounded-t-xl z-1 shadow-lg overflow-hidden border-t border-teal-700/20">
          {/* Bottom frosting drips */}
          <div className="absolute top-0 left-0 right-0 h-5 flex justify-between z-3">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-5 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500 -mt-2.5"
                style={{
                  transform: `scaleY(${1 + (i % 4) * 0.25})`
                }}
              />
            ))}
          </div>

          <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-400 z-3" />

          {/* Swirly icing patterns (Hearts instead of flowers) */}
          <div className="absolute bottom-2 inset-x-0 h-4 flex justify-around items-center text-xs font-sans text-emerald-200/40 tracking-wider">
            <span>❤</span>
            <span>❤</span>
            <span>❤</span>
            <span>❤</span>
            <span>❤</span>
          </div>
        </div>

        {/* BASE STAND (پایه کیک) */}
        <div className="w-60 h-4 bg-gradient-to-r from-emerald-200 via-sky-100 to-emerald-200 rounded-full z-0 shadow-xl border border-white/20" />
        <div className="w-28 h-6 bg-gradient-to-b from-slate-300/40 to-slate-500/10 backdrop-blur-md rounded-b-xl z-0 shadow-md border-x border-b border-slate-400/20" />
      </div>

      {/* Control Actions */}
      <div className="flex flex-col gap-3 w-full mt-2">
        {litCount > 0 ? (
          <button
            onClick={handleBlowAll}
            disabled={isBlowing}
            className="w-full relative py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-sans font-bold text-white text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isBlowing ? (
              <Wind className="w-4 h-4 animate-spin" />
            ) : (
              <Wind className="w-4 h-4 animate-bounce" />
            )}
            <span>{isBlowing ? 'درحال فوت کردن...' : 'فوت کردن تمام شمع‌ها 🎂💨'}</span>
          </button>
        ) : (
          <button
            onClick={relightCandles}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-sans font-bold text-emerald-300 text-sm flex items-center justify-center gap-2 border border-emerald-500/20 cursor-pointer transition-all duration-300 hover:scale-105"
          >
            <FlameKindling className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>روشن کردن دوباره شمع‌ها 🔥</span>
          </button>
        )}
      </div>
    </div>
  );
}
