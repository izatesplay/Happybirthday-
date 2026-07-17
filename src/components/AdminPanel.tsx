import { useState, useRef, ChangeEvent, FormEvent, useEffect } from 'react';
import { 
  X, Lock, Key, Eye, EyeOff, AlertCircle, Sparkles, 
  Trash2, Upload, RefreshCw, Loader2, Image as ImageIcon, 
  Music, FileText, Settings, Heart, LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, Wish } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  onPhotoChange: (url: string) => void;
  playlist: Song[];
  onPlaylistChange: (songs: Song[]) => void;
  currentSong: Song | null;
  onCurrentSongChange: (song: Song | null) => void;
  wishes: Wish[];
  onWishesChange: (wishes: Wish[]) => void;
  onTriggerConfetti: () => void;
}

type TabType = 'media' | 'wishes' | 'control';

export default function AdminPanel({
  isOpen,
  onClose,
  photoUrl,
  onPhotoChange,
  playlist,
  onPlaylistChange,
  currentSong,
  onCurrentSongChange,
  wishes,
  onWishesChange,
  onTriggerConfetti
}: AdminPanelProps) {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('media');

  // Media upload states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingSong, setIsUploadingSong] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const songInputRef = useRef<HTMLInputElement | null>(null);

  // Check auth status on load / when panel opens
  useEffect(() => {
    if (isOpen) {
      const storedPasscode = localStorage.getItem('admin_passcode');
      if (storedPasscode) {
        verifyPasscode(storedPasscode, true);
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [isOpen]);

  const verifyPasscode = async (code: string, silent = false) => {
    if (!silent) {
      setIsVerifying(true);
      setError('');
    }
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${code}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        localStorage.setItem('admin_passcode', code);
        setIsAuthenticated(true);
      } else {
        if (!silent) {
          setError('گذرواژه مدیریت اشتباه است. لطفا مجددا تلاش کنید.');
        }
        localStorage.removeItem('admin_passcode');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error verifying admin passcode:', err);
      if (!silent) {
        setError('خطا در ارتباط با سرور. لطفا اتصال را بررسی کنید.');
      }
    } finally {
      if (!silent) {
        setIsVerifying(false);
      }
    }
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('لطفا گذرواژه را وارد کنید.');
      return;
    }
    verifyPasscode(passcode);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_passcode');
    setIsAuthenticated(false);
    setPasscode('');
    setError('');
  };

  // 1. Upload Photo
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);

    const storedPasscode = localStorage.getItem('admin_passcode') || '';

    try {
      const response = await fetch('/api/photo/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        },
        body: formData
      });

      if (response.status === 401) {
        handleLogout();
        alert('جلسه شما منقضی شده است. لطفا دوباره وارد شوید.');
        return;
      }

      if (!response.ok) throw new Error('Failed to upload photo');

      const data = await response.json();
      if (data.activePhoto) {
        onPhotoChange(data.activePhoto);
        alert('عکس مهشید با موفقیت تغییر یافت! 🎉');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('خطا در بارگذاری تصویر. لطفا فرمت فایل (JPG, PNG, WEBP) را چک کنید.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // 2. Reset Photo
  const handlePhotoReset = async () => {
    if (!confirm('آیا مایلید عکس مهشید به حالت اولیه بازگردد؟')) return;
    setIsUploadingPhoto(true);
    const storedPasscode = localStorage.getItem('admin_passcode') || '';

    try {
      const response = await fetch('/api/photo/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        onPhotoChange(data.activePhoto);
        alert('تصویر به حالت پیش‌فرض بازگشت.');
      }
    } catch (err) {
      console.error('Error resetting photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // 3. Upload Song
  const handleSongUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const files = songInputRef.current?.files;
    if (!files || files.length === 0) {
      alert('لطفا ابتدا فایل صوتی (.mp3) را انتخاب نمایید.');
      return;
    }
    const file = files[0];
    if (!file) return;

    setIsUploadingSong(true);
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', songTitle.trim() || file.name.replace(/\.[^/.]+$/, ""));
    formData.append('artist', songArtist.trim() || 'موزیک بارگذاری شده 🎧');

    const storedPasscode = localStorage.getItem('admin_passcode') || '';

    try {
      const response = await fetch('/api/songs/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        },
        body: formData
      });

      if (response.status === 401) {
        handleLogout();
        alert('جلسه شما منقضی شده است.');
        return;
      }

      if (!response.ok) throw new Error('Upload failed');

      const updatedPlaylist = await response.json();
      onPlaylistChange(updatedPlaylist);
      
      // Select the newly uploaded song if playlist was empty
      if (updatedPlaylist.length > 0 && (!currentSong || playlist.length === 0)) {
        onCurrentSongChange(updatedPlaylist[0]);
      }

      setSongTitle('');
      setSongArtist('');
      if (songInputRef.current) songInputRef.current.value = '';
      alert('آهنگ دلخواه شما با موفقیت بارگذاری شد! 🎵🎉');
    } catch (err) {
      console.error('Error uploading song:', err);
      alert('خطا در بارگذاری فایل صوتی. لطفا حجم فایل و فرمت آن را بررسی کنید.');
    } finally {
      setIsUploadingSong(false);
    }
  };

  // 4. Delete Song
  const handleDeleteSong = async (songId: string) => {
    if (!confirm('آیا مایلید این آهنگ را برای همیشه حذف کنید؟')) return;
    
    const storedPasscode = localStorage.getItem('admin_passcode') || '';
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        }
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const updatedPlaylist = await response.json();
        onPlaylistChange(updatedPlaylist);
        
        // If current song is deleted, change it
        if (currentSong && currentSong.id === songId) {
          onCurrentSongChange(updatedPlaylist.length > 0 ? updatedPlaylist[0] : null);
        }
      } else {
        alert('خطا در حذف آهنگ از پایگاه داده.');
      }
    } catch (err) {
      console.error('Error deleting song:', err);
    }
  };

  // 5. Delete Wish
  const handleDeleteWish = async (wishId: string) => {
    if (!confirm('آیا از حذف این تبریک از تابلوی تبریک‌ها اطمینان دارید؟')) return;

    const storedPasscode = localStorage.getItem('admin_passcode') || '';
    try {
      const response = await fetch(`/api/wishes/${wishId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        }
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.ok) {
        const updatedWishes = await response.json();
        onWishesChange(updatedWishes);
      } else {
        alert('خطا در حذف تبریک از سرور.');
      }
    } catch (err) {
      console.error('Error deleting wish:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg h-full bg-slate-900 border-l border-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col text-right select-none"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-sans font-black text-emerald-100 text-lg">
                  {isAuthenticated ? 'پنل طلایی مدیریت جشنواره' : 'ورود به پنل مدیریت'}
                </span>
                <Settings className="w-5 h-5 text-emerald-400 animate-spin-slow" />
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {!isAuthenticated ? (
                /* Admin Login Form */
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="font-sans font-black text-xl text-slate-100">
                    ورود به پنل مدیریت
                  </h3>
                  <p className="font-sans text-xs text-slate-400 text-center mt-2 max-w-xs leading-relaxed">
                    جهت دسترسی به مدیریت کامل آهنگ‌ها، تصاویر و آرزوها، لطفا رمز عبور مدیریت را وارد کنید. (رمز پیش‌فرض: <code className="text-emerald-300 font-mono">1385</code>)
                  </p>

                  <form onSubmit={handleLoginSubmit} className="w-full max-w-sm mt-8 flex flex-col gap-4">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passcode}
                        onChange={(e) => {
                          setPasscode(e.target.value);
                          setError('');
                        }}
                        placeholder="گذرواژه ادمین..."
                        className="w-full text-right font-sans pl-12 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 focus:border-emerald-500 focus:outline-none text-slate-100 transition-all placeholder:text-slate-700 text-sm"
                        disabled={isVerifying}
                        autoFocus
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <Key className="w-4 h-4 text-emerald-500/50" />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-sans">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-90 active:scale-[0.98] rounded-xl text-white font-sans font-bold text-sm cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifying ? 'در حال تایید...' : 'ورود و کنترل'}
                    </button>
                  </form>
                </div>
              ) : (
                /* Authenticated Dashboard */
                <div className="flex flex-col gap-6">
                  {/* Tab bar */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/60">
                    <button
                      onClick={() => setActiveTab('control')}
                      className={`py-2 px-1 text-xs font-sans font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        activeTab === 'control' 
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>کنترل عمومی</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('wishes')}
                      className={`py-2 px-1 text-xs font-sans font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        activeTab === 'wishes' 
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>تبریک‌ها ({wishes.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('media')}
                      className={`py-2 px-1 text-xs font-sans font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        activeTab === 'media' 
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>رسانه و موزیک</span>
                    </button>
                  </div>

                  {/* TAB 1: Media and Music */}
                  {activeTab === 'media' && (
                    <div className="flex flex-col gap-6 animate-fadeIn">
                      {/* Section: Avatar photo upload */}
                      <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col gap-3">
                        <span className="font-sans font-bold text-xs text-emerald-300 block mb-1">
                          مدیریت تصویر قاب مهشید 📸
                        </span>
                        
                        <div className="flex items-center gap-4">
                          <input
                            type="file"
                            ref={photoInputRef}
                            onChange={handlePhotoUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <div className="relative w-14 h-14 rounded-full border border-slate-700 overflow-hidden bg-slate-900 flex-shrink-0">
                            {isUploadingPhoto ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                              </div>
                            ) : (
                              <img src={photoUrl} className="w-full h-full object-cover" alt="Avatar Preview" />
                            )}
                          </div>
                          
                          <div className="flex-1 flex gap-2">
                            <button
                              onClick={() => photoInputRef.current?.click()}
                              disabled={isUploadingPhoto}
                              className="flex-1 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-xs font-sans font-bold text-emerald-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>بارگذاری عکس جدید</span>
                            </button>
                            {photoUrl !== '/src/assets/images/mahshid_avatar_1784284797850.jpg' && (
                              <button
                                onClick={handlePhotoReset}
                                disabled={isUploadingPhoto}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                                title="ریست به پیش‌فرض"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section: Custom Song Upload Form */}
                      <form onSubmit={handleSongUploadSubmit} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col gap-3">
                        <span className="font-sans font-bold text-xs text-sky-300 block mb-1">
                          افزودن آهنگ دلخواه جدید (.mp3) 🎵
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-right text-[10px] text-slate-500 mb-1 mr-1">خواننده / سازنده:</label>
                            <input
                              type="text"
                              value={songArtist}
                              onChange={(e) => setSongArtist(e.target.value)}
                              placeholder="مثل: Instrumental"
                              className="w-full text-right font-sans px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 focus:border-sky-500 focus:outline-none text-slate-300 text-xs transition-all placeholder:text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-right text-[10px] text-slate-500 mb-1 mr-1">عنوان موسیقی:</label>
                            <input
                              type="text"
                              value={songTitle}
                              onChange={(e) => setSongTitle(e.target.value)}
                              placeholder="مثل: موسیقی پیانو"
                              className="w-full text-right font-sans px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 focus:border-sky-500 focus:outline-none text-slate-300 text-xs transition-all placeholder:text-slate-700"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-right text-[10px] text-slate-500 mb-1 mr-1">انتخاب فایل صوتی:</label>
                          <input
                            type="file"
                            ref={songInputRef}
                            accept="audio/mp3,audio/mpeg,audio/wav"
                            className="w-full text-right text-xs text-slate-400 font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-800 file:ml-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-300 file:cursor-pointer file:hover:bg-sky-500/20"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isUploadingSong}
                          className="w-full mt-1 py-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-90 active:scale-[0.98] rounded-xl text-white font-sans font-bold text-xs cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isUploadingSong ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>در حال آپلود و رمزگذاری فایل...</span>
                            </>
                          ) : (
                            <>
                              <Music className="w-3.5 h-3.5" />
                              <span>افزودن آهنگ به جشن</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Section: Songs Playlist Manager */}
                      <div className="flex flex-col gap-2">
                        <span className="font-sans font-bold text-xs text-slate-400 mr-1 block">
                          لیست کل موزیک‌ها ({playlist.length})
                        </span>
                        
                        <div className="max-h-[220px] overflow-y-auto border border-slate-800/80 rounded-2xl bg-slate-950/20 divide-y divide-slate-800/60 p-1">
                          {playlist.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-500 font-sans">
                              هیچ موسیقی بارگذاری نشده است.
                            </div>
                          ) : (
                            playlist.map((song) => (
                              <div
                                key={song.id}
                                className="p-2 flex items-center justify-between text-right gap-3"
                              >
                                <div className="flex gap-2">
                                  {song.isCustom && (
                                    <button
                                      onClick={() => handleDeleteSong(song.id)}
                                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
                                      title="حذف آهنگ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      onCurrentSongChange(song);
                                    }}
                                    className={`p-1 text-xs rounded-lg px-2 border transition-all cursor-pointer ${
                                      currentSong && currentSong.id === song.id 
                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                                        : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:text-white'
                                    }`}
                                  >
                                    پخش
                                  </button>
                                </div>
                                <div className="overflow-hidden">
                                  <span className="font-sans text-xs text-slate-200 block truncate font-bold">{song.title}</span>
                                  <span className="font-sans text-[10px] text-slate-500 block truncate">{song.artist}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Wishes Moderation */}
                  {activeTab === 'wishes' && (
                    <div className="flex flex-col gap-4 animate-fadeIn">
                      <span className="font-sans font-bold text-xs text-emerald-300 mr-1 block">
                        مدیریت و حذف آرزوهای تبریک ({wishes.length})
                      </span>

                      <div className="max-h-[380px] overflow-y-auto border border-slate-800/80 rounded-2xl bg-slate-950/20 divide-y divide-slate-800/60 p-2 flex flex-col gap-2">
                        {wishes.length === 0 ? (
                          <div className="text-center py-12 text-xs text-slate-500 font-sans">
                            هنوز تبریکی ثبت نشده است 🎂
                          </div>
                        ) : (
                          wishes.map((wish) => (
                            <div
                              key={wish.id}
                              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/50 flex flex-col gap-2 text-right relative"
                            >
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => handleDeleteWish(wish.id)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                                  title="حذف تبریک"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                                <span className="font-sans font-black text-xs text-emerald-300">
                                  فرستنده: {wish.sender}
                                </span>
                              </div>
                              <p className="font-sans text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2 rounded-lg">
                                {wish.text}
                              </p>
                              <span className="font-mono text-[9px] text-slate-500 self-end">
                                {new Date(wish.timestamp).toLocaleDateString('fa-IR')} {new Date(wish.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Control Center */}
                  {activeTab === 'control' && (
                    <div className="flex flex-col gap-6 animate-fadeIn py-4">
                      {/* Section: Direct Confetti burst */}
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-sky-500/5 to-transparent border border-emerald-500/10 flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-sans font-black text-sm text-slate-100">شلیک نورباران و فشفشه 🎉</h4>
                          <p className="font-sans text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                            با کلیک بر روی این دکمه، فوراً یک جشن نورانی سراسری از فشفشه‌ها و تبریکات در صفحه برای تمامی حاضران منفجر می‌شود!
                          </p>
                        </div>
                        <button
                          onClick={onTriggerConfetti}
                          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 hover:scale-105 active:scale-95 text-white font-sans font-black text-xs cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                        >
                          شلیک فشفشه‌ها و بادکنک‌ها 🎈✨
                        </button>
                      </div>

                      {/* Section: Developer note */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-right">
                        <span className="font-sans text-xs text-sky-300 font-bold block mb-1">درباره سیستم مدیریت</span>
                        <p className="font-sans text-[10px] text-slate-400 leading-relaxed">
                          رمز عبور پیش‌فرض ورود به مدیریت <code className="text-emerald-300 font-mono">1385</code> می‌باشد. شما می‌توانید برای امنیت بیشتر آن را در فایل‌های پیکربندی سیستم تغییر دهید. تمامی عملیات‌های انجام شده از جمله حذف و آپلود فوراً با دیتابیس همگام‌سازی می‌شوند.
                        </p>
                      </div>

                      {/* Logout button */}
                      <button
                        onClick={handleLogout}
                        className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:text-rose-300 transition-all font-sans font-bold text-xs text-slate-400 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>خروج از حساب مدیریت</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 text-center font-sans text-[10px] text-slate-600">
              مدیریت تولد رویایی مهشید • نسخه ۲.۰ • ۱۴۰۵
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
