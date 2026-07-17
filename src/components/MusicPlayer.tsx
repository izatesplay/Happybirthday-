import React, { useState, useEffect, useRef, ChangeEvent, MutableRefObject } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Music, Upload, Music4, Compass, Loader2 } from 'lucide-react';
import { Song } from '../types';
import { DEFAULT_SONGS } from '../data';
import AdminAuthModal from './AdminAuthModal';

interface MusicPlayerProps {
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  currentSong: Song;
  setCurrentSong: (song: Song) => void;
}

export default function MusicPlayer({
  isPlaying,
  onPlayingChange,
  audioRef,
  currentSong,
  setCurrentSong
}: MusicPlayerProps) {
  const [playlist, setPlaylist] = useState<Song[]>(DEFAULT_SONGS);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Load playlist from server on mount
  useEffect(() => {
    fetch('/api/songs')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch songs');
        return res.json();
      })
      .then((data) => {
        if (data && data.length > 0) {
          setPlaylist(data);
          // If the currentSong is still the default fallback, override with the first song from DB
          if (currentSong.id === DEFAULT_SONGS[0]?.id) {
            setCurrentSong(data[0]);
          }
        }
      })
      .catch((err) => console.error('Error fetching songs on mount:', err));
  }, []);
  const [volume, setVolume] = useState(0.6);
  const [isMuted, setIsMuted] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize audio element settings
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleNext();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [volume, isMuted, playlist]);

  // Handle play/pause state synchronization
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Audio play was interrupted or blocked:', err);
        onPlayingChange(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong]);

  // Draw Audio Visualizer waves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;
    const width = (canvas.width = 300);
    const height = (canvas.height = 50);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const waveCount = 3;
      const waveColors = [
        'rgba(16, 185, 129, 0.4)',  // Emerald Green
        'rgba(14, 165, 233, 0.4)',  // Sky Blue
        'rgba(20, 184, 166, 0.2)'   // Teal
      ];

      // Draw horizontal baseline
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (isPlaying) {
        phase += 0.08; // speed of wave animation
      }

      for (let w = 0; w < waveCount; w++) {
        ctx.strokeStyle = waveColors[w]!;
        ctx.lineWidth = 1.5 + w * 0.5;
        ctx.beginPath();

        const amplitude = isPlaying ? 12 - w * 3 : 1; // dynamic height
        const frequency = 0.02 + w * 0.01; // frequency spread

        for (let x = 0; x < width; x++) {
          const y =
            height / 2 +
            Math.sin(x * frequency + phase + w * Math.PI / 4) *
              amplitude *
              Math.sin(x / width * Math.PI); // Pin the ends to center

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const handlePlayPause = () => {
    onPlayingChange(!isPlaying);
  };

  const handleNext = () => {
    const currentIndex = playlist.findIndex((s) => s.id === currentSong.id);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      nextIndex = 0;
    }
    const nextSong = playlist[nextIndex];
    if (nextSong) {
      setCurrentSong(nextSong);
      onPlayingChange(true);
    }
  };

  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
    onPlayingChange(true);
    setIsListOpen(false);
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = parseFloat(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = parseFloat(e.target.value);
    setVolume(value);
    audio.volume = isMuted ? 0 : value;
    if (value > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.volume = nextMuted ? 0 : volume;
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingFileRef = useRef<File | null>(null);

  const uploadSongFile = async (file: File, overridePasscode?: string) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ""));
    formData.append('artist', 'موزیک بارگذاری شده 🎧');

    const storedPasscode = overridePasscode || localStorage.getItem('admin_passcode') || '';

    try {
      const response = await fetch('/api/songs/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem('admin_passcode');
        pendingFileRef.current = file;
        setIsAuthModalOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to upload song');
      }

      const updatedPlaylist = await response.json();
      setPlaylist(updatedPlaylist);
      if (updatedPlaylist.length > 0) {
        setCurrentSong(updatedPlaylist[0]);
        onPlayingChange(true);
      }
    } catch (err) {
      console.error('Error uploading song:', err);
      alert('خطا در بارگذاری آهنگ. لطفا دوباره تلاش کنید.');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload and handle custom MP3 file to backend database/filesystem
  const handleCustomAudioUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file) {
      uploadSongFile(file);
    }
  };

  const handleAuthSuccess = (passcode: string) => {
    if (pendingFileRef.current) {
      uploadSongFile(pendingFileRef.current, passcode);
      pendingFileRef.current = null;
    }
  };

  const triggerUploadClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="relative w-full p-5 rounded-2xl glass-card border-emerald-500/20 shadow-lg flex flex-col gap-4">
      <audio
        ref={(el) => {
          audioRef.current = el;
        }}
        src={currentSong.url}
        preload="auto"
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomAudioUpload}
        accept="audio/*"
        className="hidden"
      />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-sky-500/20 border border-emerald-400/20 flex items-center justify-center flex-shrink-0 animate-pulse-slow">
            <Music className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="overflow-hidden text-right">
            <h3 className="font-sans font-bold text-sm text-emerald-100 truncate leading-tight">
              {currentSong.title}
            </h3>
            <span className="font-sans text-xs text-slate-400 block mt-0.5 truncate">
              {currentSong.artist}
            </span>
          </div>
        </div>

        {/* Custom Audio Upload Button */}
        <button
          onClick={triggerUploadClick}
          disabled={isUploading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs text-emerald-300 font-sans cursor-pointer transition-all duration-300 hover:scale-105 disabled:opacity-50"
          title="آپلود آهنگ دلخواه"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>درحال آپلود...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>موزیک دلخواه</span>
            </>
          )}
        </button>
      </div>

      {/* Animated Waves Canvas */}
      <div className="bg-slate-950/40 rounded-xl py-1 px-3 flex justify-center border border-slate-800/50">
        <canvas ref={canvasRef} className="w-full h-[50px] opacity-90" />
      </div>

      {/* Progress timeline */}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
        />
        <div className="flex justify-between text-xs text-slate-500 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Player Controls & Volume */}
      <div className="flex items-center justify-between gap-4 mt-1">
        {/* Playlist Toggle */}
        <button
          onClick={() => setIsListOpen(!isListOpen)}
          className={`px-3 py-1.5 rounded-lg text-xs font-sans border cursor-pointer transition-all ${
            isListOpen
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-emerald-300'
          }`}
        >
          {isListOpen ? 'بستن لیست ✕' : 'لیست آهنگ‌ها ☰'}
        </button>

        {/* Center play buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 text-white transition-all duration-200"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white translate-x-0.5" />}
          </button>
          <button
            onClick={handleNext}
            className="p-2 text-slate-400 hover:text-emerald-300 cursor-pointer hover:scale-110 active:scale-95 transition-all"
            title="آهنگ بعدی"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-emerald-300 cursor-pointer transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Overlay Dropdown Playlist */}
      {isListOpen && (
        <div className="absolute top-[102%] left-0 right-0 z-20 mt-1 max-h-[180px] overflow-y-auto rounded-xl bg-slate-900 border border-emerald-500/20 shadow-2xl p-2 flex flex-col gap-1 divide-y divide-slate-800 animate-fadeIn">
          {playlist.map((song) => (
            <button
              key={song.id}
              onClick={() => handleSelectSong(song)}
              className={`w-full text-right px-3 py-2 text-xs font-sans rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                song.id === currentSong.id
                  ? 'bg-emerald-500/10 text-emerald-300 font-bold border-l-2 border-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {song.id === currentSong.id ? (
                  <Music4 className="w-3.5 h-3.5 text-emerald-400 animate-pulse-slow" />
                ) : (
                  <Music className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="truncate">{song.title}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[100px]">
                {song.artist}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Admin Passcode Modal for music operations */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          pendingFileRef.current = null;
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
