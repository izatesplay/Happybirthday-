import { useState } from 'react';
import { Sparkles, Music, Star, ChevronLeft, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingScreenProps {
  onEnter: () => void;
}

export default function LandingScreen({ onEnter }: LandingScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleStart = () => {
    setIsExiting(true);
    // Let exit animation complete before triggering state change
    setTimeout(() => {
      onEnter();
    }, 850);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          id="landing-portal"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(15px)' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-radial-gradient overflow-hidden"
        >
          {/* Ambient Glowing Orbs */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

          <div className="relative max-w-lg w-full text-center px-6 py-12 rounded-3xl glass-card animate-glow border-emerald-500/30 flex flex-col items-center">
            {/* Glowing Corner Hearts */}
            <Heart className="absolute top-6 left-6 text-emerald-400 fill-emerald-400/20 w-5 h-5 animate-pulse" />
            <Heart className="absolute bottom-6 right-6 text-sky-400 fill-sky-400/20 w-5 h-5 animate-pulse" />

            {/* Glowing Icon Shield */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
              className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600/30 to-sky-600/30 border border-emerald-400/30 flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
            >
              <Music className="w-10 h-10 text-emerald-300 animate-bounce" />
              <Sparkles className="absolute -top-1 -right-1 text-emerald-400 w-6 h-6 animate-pulse" />
            </motion.div>

            {/* Title / Greetings */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-4 leading-relaxed"
            >
              رویدادی خاص؛ میلادِ <span className="text-gradient">مهشیدِ</span> گرانقدر ✨
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-sans text-sm sm:text-base text-emerald-200/80 mb-10 leading-loose max-w-md"
            >
              به تالارِ رویایی و جادویی، مزین به رنگ‌های چشم‌نواز زمردی و آبی آسمانی خوش آمدید. جشنی به لطافتِ نگاهِ نابتان و به وقار و متانتِ روحِ بی‌تکرارتان...
            </motion.p>

            {/* The Grand Portal Button */}
            <motion.button
              id="enter-party-btn"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
              onClick={handleStart}
              className="relative group px-8 py-4 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full text-white font-sans font-bold text-lg cursor-pointer shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:shadow-[0_0_40px_rgba(14,165,233,0.6)] border border-emerald-400/20 overflow-hidden flex items-center gap-3"
            >
              {/* Button shimmer background effect */}
              <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 rounded-full" />
              
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>پخش آهنگ و ورود به تالار جادو ✨</span>
            </motion.button>

            {/* Hint */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1 }}
              className="text-xs text-slate-400 font-mono mt-6"
            >
              Sound Recommended • Vol 60%
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
