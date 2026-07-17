import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Camera, Image as ImageIcon, Sparkles, RefreshCw, Loader2, Heart } from 'lucide-react';
import AdminAuthModal from './AdminAuthModal';

interface PhotoSectionProps {
  photoUrl: string;
  onPhotoChange: (url: string) => void;
}

export default function PhotoSection({ photoUrl, onPhotoChange }: PhotoSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionType, setAuthActionType] = useState<'upload' | 'reset' | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  const uploadFile = async (file: File, overridePasscode?: string) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    const storedPasscode = overridePasscode || localStorage.getItem('admin_passcode') || '';

    try {
      const response = await fetch('/api/photo/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem('admin_passcode');
        pendingFileRef.current = file;
        setAuthActionType('upload');
        setIsAuthModalOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      if (data.activePhoto) {
        onPhotoChange(data.activePhoto);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('خطا در بارگذاری تصویر. لطفا دوباره تلاش کنید.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) {
        uploadFile(file);
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        uploadFile(file);
      }
    }
  };

  const triggerUploadClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const resetPhoto = async (overridePasscode?: string) => {
    setIsUploading(true);
    const storedPasscode = overridePasscode || localStorage.getItem('admin_passcode') || '';

    try {
      const response = await fetch('/api/photo/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedPasscode}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('admin_passcode');
        setAuthActionType('reset');
        setIsAuthModalOpen(true);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        onPhotoChange(data.activePhoto);
      }
    } catch (error) {
      console.error('Error resetting photo:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAuthSuccess = (passcode: string) => {
    if (authActionType === 'upload' && pendingFileRef.current) {
      uploadFile(pendingFileRef.current, passcode);
      pendingFileRef.current = null;
    } else if (authActionType === 'reset') {
      resetPhoto(passcode);
    }
    setAuthActionType(null);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Photo Frame Container */}
      <div className="relative group mb-6">
        {/* Animated outer double rotating neon rings */}
        <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-500 opacity-80 blur-md animate-spin" style={{ animationDuration: '10s' }} />
        <div className="absolute -inset-1 rounded-full bg-gradient-to-bl from-sky-400 via-emerald-400 to-teal-500 opacity-90 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />

        {/* Real photo frame with glass backing */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-slate-950 p-2 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          {/* Hearts floating inside frame */}
          <Heart className="absolute top-4 right-10 text-emerald-400 fill-emerald-400/20 w-5 h-5 animate-pulse" />
          <Heart className="absolute bottom-6 left-8 text-sky-400 fill-sky-400/20 w-4 h-4 animate-pulse" style={{ animationDelay: '0.8s' }} />

          {isUploading ? (
            <div className="w-full h-full rounded-full bg-slate-900/80 flex flex-col items-center justify-center text-emerald-300">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="font-sans text-xs">در حال بارگذاری...</span>
            </div>
          ) : (
            <img
              src={photoUrl}
              alt="مهشید"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full select-none transition-transform duration-500 group-hover:scale-105"
            />
          )}

          {/* Interactive Drag & Drop / Upload Overlay on Hover */}
          {!isUploading && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerUploadClick}
              className={`absolute inset-0 rounded-full bg-slate-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer p-4 text-center border-2 border-dashed ${
                isDragging ? 'border-emerald-400 bg-emerald-950/70 opacity-100' : 'border-sky-400/50'
              }`}
            >
              <Camera className="w-8 h-8 text-sky-300 mb-2 animate-bounce" />
              <span className="font-sans font-bold text-xs text-white leading-loose">
                {isDragging ? 'عکس را همینجا رها کنید!' : 'تغییر عکس مهشید 📸'}
              </span>
              <span className="font-sans text-[10px] text-emerald-300/80 mt-1">
                کلیک کنید یا فایل را بکشید
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons for Photo */}
      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          accept="image/*"
          className="hidden"
        />

        <button
          onClick={triggerUploadClick}
          disabled={isUploading}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-sky-500/10 hover:from-emerald-500/20 hover:to-sky-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-xs font-sans font-bold text-emerald-200 transition-all cursor-pointer hover:scale-105 flex items-center gap-2 disabled:opacity-50"
        >
          <ImageIcon className="w-3.5 h-3.5 text-sky-300" />
          <span>آپلود عکس مهشید</span>
        </button>

        {/* Show restore default button if custom photo is loaded */}
        {photoUrl !== '/src/assets/images/mahshid_avatar_1784284797850.jpg' && (
          <button
            onClick={resetPhoto}
            disabled={isUploading}
            className="p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer disabled:opacity-50"
            title="بازگشت به تصویر اولیه"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
          </button>
        )}
      </div>

      {/* Admin Passcode Modal for photo operations */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthActionType(null);
          pendingFileRef.current = null;
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
