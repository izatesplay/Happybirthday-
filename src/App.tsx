import { useState, useRef, useEffect } from 'react';
import { Sparkles, Heart, Star, Calendar, Settings, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LandingScreen from './components/LandingScreen';
import BackgroundParticles from './components/BackgroundParticles';
import MusicPlayer from './components/MusicPlayer';
import PhotoSection from './components/PhotoSection';
import InteractiveCake from './components/InteractiveCake';
import GiftBoxesSection from './components/GiftBoxesSection';
import AdminPanel from './components/AdminPanel';
import { Song, Wish } from './types';
import { DEFAULT_SONGS } from './data';

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('/src/assets/images/mahshid_avatar_1784284797850.jpg');
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Fetch initial state (e.g. active photo) on mount
  useEffect(() => {
    fetch('/api/state')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch state');
      })
      .then(data => {
        if (data.activePhoto) {
          setPhotoUrl(data.activePhoto);
        }
        if (data.songs && data.songs.length > 0) {
          setPlaylist(data.songs);
          setCurrentSong(data.songs[0]);
        }
        if (data.wishes) {
          setWishes(data.wishes);
        }
      })
      .catch(err => console.error('Error fetching initial state on mount:', err));
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trigger grand celebration (Confetti explosion!)
  const triggerCelebration = () => {
    setIsCelebrating(true);
    // Automatically stop emitting after 6 seconds to save CPU, but keep standard ambient floating particles
    setTimeout(() => {
      setIsCelebrating(false);
    }, 6000);
  };

  // Confetti Physics simulation on full-screen Canvas
  useEffect(() => {
    if (!hasEntered) return;
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    interface ConfettiPiece {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }

    const confettiColors = [
      '#10b981', // Emerald
      '#34d399', // Mint green
      '#06b6d4', // Cyan
      '#0ea5e9', // Sky blue
      '#38bdf8', // Light blue
      '#fbbf24', // Yellow gold
      '#a7f3d0', // Pastel mint
      '#bae6fd'  // Pastel blue
    ];

    let confetti: ConfettiPiece[] = [];

    const spawnConfetti = () => {
      for (let i = 0; i < 150; i++) {
        confetti.push({
          x: Math.random() * width,
          y: Math.random() * -100 - 10,
          size: Math.random() * 8 + 4,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)]!,
          speedX: (Math.random() - 0.5) * 3,
          speedY: Math.random() * 4 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5
        });
      }
    };

    // If celebration is active, continuously spawn new bursts of confetti!
    if (isCelebrating) {
      spawnConfetti();
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, width, height);

      confetti.forEach((c, idx) => {
        c.y += c.speedY;
        c.x += c.speedX;
        c.rotation += c.rotationSpeed;

        // Draw rotated confetti shape
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.fillStyle = c.color;
        
        // Randomly draw rectangles or circles or triangles
        if (idx % 3 === 0) {
          ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size / 1.5);
        } else if (idx % 3 === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -c.size / 2);
          ctx.lineTo(c.size / 2, c.size / 2);
          ctx.lineTo(-c.size / 2, c.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      // Filter out offscreen ones
      confetti = confetti.filter((c) => c.y < height + 20);

      animId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [hasEntered, isCelebrating]);

  const handleEnterParty = () => {
    setHasEntered(true);
    setIsPlaying(true); // Trigger music playback on entrance
    triggerCelebration(); // Launch initial welcome confetti storm
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans bg-radial-gradient relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200 pb-12">
      
      {/* 1. Landing Screen Gate */}
      <LandingScreen onEnter={handleEnterParty} />

      {/* 2. Ambient Particles System (Active always behind layout) */}
      <BackgroundParticles />

      {/* 3. Screen-wide Confetti Canvas */}
      {hasEntered && (
        <canvas
          ref={confettiCanvasRef}
          className="fixed inset-0 w-full h-full z-40 pointer-events-none"
        />
      )}

      {/* 4. Active Celebratory HUD Alerts */}
      <AnimatePresence>
        {isCelebrating && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-full bg-emerald-950/90 border border-emerald-400 text-center shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-3"
          >
            <Heart className="w-5 h-5 text-emerald-400 animate-pulse fill-emerald-400/20" />
            <span className="font-display text-lg text-white">میلادِ خجسته و رویایی‌ات مبارک مهشیدِ عزیز ✨💚🍰</span>
            <Heart className="w-5 h-5 text-emerald-400 animate-pulse fill-emerald-400/20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CELEBRATION APP CONTENT */}
      {hasEntered && (
        <main className="max-w-6xl mx-auto px-4 pt-10 sm:pt-14 relative z-10 flex flex-col gap-10">
          
          {/* AESTHETIC GRAND HEADER */}
          <div className="text-center relative flex flex-col items-center">
            
            {/* Little floating side heart/star decor */}
            <div className="absolute left-10 top-0 animate-float hidden md:block">
              <Heart className="w-8 h-8 text-emerald-400 fill-emerald-400/20 blur-[0.5px] animate-pulse-slow" />
            </div>
            <div className="absolute right-10 bottom-0 animate-float hidden md:block" style={{ animationDelay: '2.5s' }}>
              <Heart className="w-8 h-8 text-sky-400 fill-sky-400/20 blur-[0.5px] animate-pulse-slow" />
            </div>

            {/* Subtitle Card */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-sans mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>جشنواره‌ی تولد رویاییِ مهشیدِ گرانقدر • ۲۶ تیرماه 🍃🌸</span>
            </div>

            {/* Glowing grand title */}
            <h1 className="font-display text-5xl sm:text-7xl text-white tracking-wide leading-tight mb-2 select-none filter drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              مهشیدِ عزیز <span className="text-gradient animate-pulse-slow">میلادت خجسته باد!</span> 💚
            </h1>
            
            <p className="font-sans text-sm sm:text-base text-slate-400 max-w-lg leading-loose mt-2">
              امروز تلاقیِ بی‌نظیرِ بهارِ خرم و درخششِ بی‌کرانِ فیروزه‌ای افق است. تالاری رویایی، کیکی معطر به عطر گل‌های یاس و جعبه‌های اسرارآمیزی منتظر لمس دستان مهربان و پر از وقار شماست.
            </p>
          </div>

          {/* TWO COLUMN GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDE COLUMN: PHOTO + MUSIC DECK (lg:span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              
              {/* Photo Card Container with full decoration */}
              <div className="glass-card rounded-3xl border-emerald-500/10 p-8 flex flex-col items-center relative overflow-hidden group shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <h3 className="font-sans font-black text-emerald-100 text-lg mb-6 leading-tight select-none flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400/20 animate-pulse" />
                  <span>صاحبِ این قابِ تماشایی،</span>
                  <span className="text-sky-300">مهشیدِ گرانقدر</span>👑
                </h3>
                
                {/* Photo frame + upload trigger component */}
                <PhotoSection photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />
              </div>

              {/* Music Player Deck */}
              <div className="flex flex-col gap-3">
                <span className="font-sans text-xs text-slate-400 font-bold mr-1 text-right block">
                  دک پخش موسیقی جشن 🎧
                </span>
                <MusicPlayer
                  isPlaying={isPlaying}
                  onPlayingChange={setIsPlaying}
                  audioRef={audioRef}
                  currentSong={currentSong}
                  setCurrentSong={setCurrentSong}
                  playlist={playlist}
                  onPlaylistChange={setPlaylist}
                />
              </div>

            </div>

            {/* RIGHT SIDE COLUMN: INTERACTIVE CAKE + EXTRA DECOR (lg:span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              
              {/* Interactive Cake blowing section */}
              <div className="glass-card rounded-3xl border-emerald-500/10 p-8 flex flex-col items-center relative overflow-hidden shadow-lg">
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="w-full text-right mb-6 select-none">
                  <h3 className="font-sans font-black text-emerald-100 text-lg leading-tight flex items-center justify-end gap-2">
                    <Heart className="w-4 h-4 text-sky-400 fill-sky-400/20 animate-pulse" />
                    <span>کیک رویایی فوت‌کردن آرزوها</span>
                    <span className="text-xl">🎂</span>
                  </h3>
                  <p className="font-sans text-xs text-slate-400 mt-1">
                    شمع‌ها را تک‌تک فوت کنید یا کلید فوت همگانی را فشار دهید تا جادو آغاز شود!
                  </p>
                </div>

                <InteractiveCake onBlowAll={triggerCelebration} />
              </div>



            </div>

          </div>

          {/* LOWER FULL-WIDTH PANEL: INTERACTIVE SURPRISE GIFT BOXES */}
          <div className="border-t border-slate-800/60 pt-10 mt-4">
            <GiftBoxesSection wishes={wishes} onWishesChange={setWishes} />
          </div>

          {/* Humble Aesthetic Footer */}
          <div className="text-center text-slate-600 font-sans text-[11px] mt-8 flex flex-col items-center gap-1.5 select-none">
            <span>تقدیم با نهایت احترام و آرزوهای طلایی برای مهشیدِ عزیز و ارزشمند 🍃💙</span>
            <span>Created with Charm & Elegance • 2026</span>
          </div>

        </main>
      )}

      {/* 5. Floating Admin Panel Access Button */}
      {hasEntered && (
        <button
          onClick={() => setIsAdminOpen(true)}
          className="fixed top-6 left-6 z-40 p-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 hover:text-white hover:bg-slate-800 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 px-4"
          title="ورود به پنل مدیریت"
        >
          <Lock className="w-4 h-4" />
          <span className="font-sans font-bold text-xs">پنل مدیریت ادمین</span>
        </button>
      )}

      {/* 6. Admin Panel Drawer */}
      {hasEntered && (
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          photoUrl={photoUrl}
          onPhotoChange={setPhotoUrl}
          playlist={playlist}
          onPlaylistChange={setPlaylist}
          currentSong={currentSong}
          onCurrentSongChange={setCurrentSong}
          wishes={wishes}
          onWishesChange={setWishes}
          onTriggerConfetti={() => {
            triggerCelebration();
            setIsAdminOpen(false);
          }}
        />
      )}
    </div>
  );
}
