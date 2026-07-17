import { useState, FormEvent } from 'react';
import { Lock, Key, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (passcode: string) => void;
}

export default function AdminAuthModal({ isOpen, onClose, onSuccess }: AdminAuthModalProps) {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('لطفا رمز عبور را وارد کنید.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${passcode}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        localStorage.setItem('admin_passcode', passcode);
        onSuccess(passcode);
        setPasscode('');
        onClose();
      } else {
        setError('گذرواژه مدیریت نادرست است. لطفا دوباره تلاش کنید.');
      }
    } catch (err) {
      console.error('Error verifying passcode:', err);
      setError('خطا در ارتباط با سرور. لطفا اتصال خود را بررسی کنید.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-md bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden text-right select-none"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans font-black text-xl text-emerald-100">
                تأیید هویت مدیریت
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                آپلود عکس و آهنگ منحصراً در دسترس مدیریت است. لطفا گذرواژه ورود را وارد نمایید.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <label className="block text-right font-sans text-xs font-bold text-slate-400 mb-2 mr-1">
                  گذرواژه مدیریت:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      setError('');
                    }}
                    placeholder="رمز عبور مدیریت..."
                    className="w-full text-right font-sans pl-12 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 focus:border-emerald-500 focus:outline-none text-slate-100 transition-all placeholder:text-slate-700 text-sm"
                    disabled={isVerifying}
                    autoFocus
                  />
                  {/* Left-side icons/buttons inside RTL input */}
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
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-sans"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-90 active:scale-[0.98] rounded-xl text-white font-sans font-bold text-sm cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? 'در حال بررسی...' : 'تأیید و ورود'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isVerifying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:text-white rounded-xl text-sm font-sans text-slate-400 cursor-pointer transition-all"
                >
                  انصراف
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
