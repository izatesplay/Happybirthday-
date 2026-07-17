import React, { useState, useEffect, FormEvent } from 'react';
import { Gift, BookOpen, PenTool, Sparkles, MessageSquare, Send, Check, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MAWSHID_POEMS, PRESET_WISHES } from '../data';
import { Wish } from '../types';
import BalloonPopGame from './BalloonPopGame';

export default function GiftBoxesSection() {
  const [activeGift, setActiveGift] = useState<number | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  
  // Wishing form states
  const [senderName, setSenderName] = useState('');
  const [wishText, setWishText] = useState('');
  const [selectedColor, setSelectedColor] = useState<'blue' | 'green' | 'teal' | 'turquoise'>('green');
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Load wishes from backend API on mount
  useEffect(() => {
    fetch('/api/wishes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch wishes');
        return res.json();
      })
      .then((data) => {
        setWishes(data);
      })
      .catch((err) => {
        console.error('Error fetching wishes:', err);
        setWishes(PRESET_WISHES);
      });
  }, []);

  const handleAddWish = async (e: FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !wishText.trim()) return;

    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: senderName.trim(),
          text: wishText.trim(),
          color: selectedColor,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add wish');
      }

      const updatedWishes = await response.json();
      setWishes(updatedWishes);
      setSenderName('');
      setWishText('');
    } catch (err) {
      console.error('Error saving wish:', err);
      alert('خطا در ثبت تبریک. لطفا دوباره تلاش کنید.');
    }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(`${title}\n\n${text}`);
    setIsCopied(title);
    setTimeout(() => {
      setIsCopied(null);
    }, 2000);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="font-display text-3xl text-gradient mb-8 text-center leading-relaxed flex items-center justify-center gap-2 select-none">
        <Heart className="w-6 h-6 text-emerald-400 fill-emerald-400/20 animate-pulse" />
        <span>جعبه‌های هدیه شگفت‌انگیز را باز کنید!</span>
        <Heart className="w-6 h-6 text-sky-400 fill-sky-400/20 animate-pulse" />
      </h2>

      {/* THREE INTERACTIVE GIFT BOXES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-4xl px-4">
        {[
          {
            id: 1,
            title: 'آرزوهای طلایی',
            desc: 'شعر و یادداشت تبریک',
            icon: BookOpen,
            colorClass: 'from-emerald-400 to-teal-500',
            glowColor: 'rgba(16,185,129,0.4)',
            boxIcon: '📜'
          },
          {
            id: 2,
            title: 'تخته‌ی تبریک دیواری',
            desc: 'پیام تبریک صمیمانه بنویسید',
            icon: PenTool,
            colorClass: 'from-sky-400 to-blue-500',
            glowColor: 'rgba(14,165,233,0.4)',
            boxIcon: '📝'
          },
          {
            id: 3,
            title: 'سوپرایز بادکنکی',
            desc: 'بازی هیجان‌انگیز مهشید',
            icon: Sparkles,
            colorClass: 'from-teal-400 to-sky-400',
            glowColor: 'rgba(6,182,212,0.4)',
            boxIcon: '🎈'
          }
        ].map((gift) => (
          <motion.div
            key={gift.id}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveGift(gift.id)}
            className="flex flex-col items-center p-6 rounded-2xl glass-card border-emerald-500/10 cursor-pointer text-center relative group overflow-hidden"
            style={{
              boxShadow: `0 10px 30px -10px ${gift.glowColor}`
            }}
          >
            {/* Hover sparkle border flare */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-sky-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Gift Box Graphic Wrapper */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-4">
              {/* Shake animation on hover */}
              <div className="group-hover:animate-bounce duration-300">
                <span className="text-6xl select-none">{gift.boxIcon}</span>
              </div>

              {/* Floating micro-stars */}
              <div className="absolute top-1 right-2 text-yellow-300 text-sm animate-ping">✨</div>
              <div className="absolute bottom-2 left-1 text-sky-300 text-sm animate-pulse">✦</div>
            </div>

            <h3 className="font-sans font-black text-emerald-100 text-lg leading-tight mb-1">
              {gift.title}
            </h3>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              {gift.desc}
            </p>

            <span className="mt-4 px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-sans font-medium hover:bg-emerald-500/20 transition-all">
              کلیک کنید و باز کنید 🔓
            </span>
          </motion.div>
        ))}
      </div>

      {/* GIFT MODAL POPUPS */}
      <AnimatePresence>
        {activeGift !== null && (
          <div
            id="gift-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setActiveGift(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()} // Stop closing on card click
              className="w-full max-w-2xl bg-slate-900 border border-emerald-500/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/40 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-display text-xl text-white flex items-center gap-1.5">
                    {activeGift === 1 && (
                      <>
                        <span>📜 آرزوهای طلایی و شعر</span>
                        <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400/20 animate-pulse" />
                      </>
                    )}
                    {activeGift === 2 && (
                      <>
                        <span>📝 تخته تبریک صمیمانه</span>
                        <Heart className="w-4 h-4 text-sky-400 fill-sky-400/20 animate-pulse" />
                      </>
                    )}
                    {activeGift === 3 && (
                      <>
                        <span>🎈 بازی ترکاندن بادکنک‌ها</span>
                        <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400/20 animate-pulse" />
                      </>
                    )}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveGift(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Content Box */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* GIFT 1 CONTENT: POEMS */}
                {activeGift === 1 && (
                  <div className="flex flex-col gap-6">
                    {MAWSHID_POEMS.map((poem, index) => (
                      <div
                        key={index}
                        className="p-5 rounded-2xl bg-slate-950/50 border border-emerald-500/10 hover:border-emerald-500/30 transition-all flex flex-col relative"
                      >
                        <h4 className="font-sans font-black text-emerald-300 text-sm mb-3 flex items-center gap-1.5">
                          <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400/20 animate-pulse" />
                          <span>{poem.title}</span>
                        </h4>
                        <p className="font-sans text-xs sm:text-sm text-slate-300 leading-loose text-justify whitespace-pre-line text-right">
                          {poem.text}
                        </p>

                        <button
                          onClick={() => copyToClipboard(poem.text, poem.title)}
                          className="self-end mt-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-300 font-sans text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {isCopied === poem.title ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>کپی شد!</span>
                            </>
                          ) : (
                            <>
                              <span>کپی متن تبریک</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* GIFT 2 CONTENT: WISHING BOARD */}
                {activeGift === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Submit message form */}
                    <form onSubmit={handleAddWish} className="flex flex-col gap-4">
                      <h4 className="font-sans font-black text-emerald-200 text-sm mb-1 text-right">
                        تبریک تولد خودت رو برای مهشید ثبت کن! ✨
                      </h4>

                      <div className="flex flex-col gap-1.5 text-right">
                        <label className="font-sans text-xs text-slate-400">نام شما</label>
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="مثلاً: مریم، رضا ..."
                          className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 text-right"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 text-right">
                        <label className="font-sans text-xs text-slate-400">متن تبریک صمیمانه</label>
                        <textarea
                          required
                          value={wishText}
                          onChange={(e) => setWishText(e.target.value)}
                          rows={3}
                          placeholder="مهشید عزیزم، برات بهترین‌ها رو می‌خوام..."
                          className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 text-right resize-none"
                        />
                      </div>

                      {/* Tag Color selection */}
                      <div className="flex flex-col gap-2 text-right">
                        <label className="font-sans text-xs text-slate-400">رنگ حاشیه یادداشت</label>
                        <div className="flex gap-3 justify-end">
                          {[
                            { id: 'green', color: 'bg-emerald-400' },
                            { id: 'blue', color: 'bg-sky-400' },
                            { id: 'teal', color: 'bg-teal-400' },
                            { id: 'turquoise', color: 'bg-cyan-400' }
                          ].map((col) => (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => setSelectedColor(col.id as any)}
                              className={`w-6 h-6 rounded-full ${col.color} border-2 cursor-pointer transition-transform ${
                                selectedColor === col.id ? 'border-white scale-125 shadow-lg' : 'border-transparent'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-sans font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-[1.02]"
                      >
                        <Send className="w-4 h-4 translate-y-0.5" />
                        <span>ارسال و ثبت تبریک 🚀</span>
                      </button>
                    </form>

                    {/* Wishes Wall List */}
                    <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                      <h4 className="font-sans font-black text-slate-400 text-xs mb-1 text-right">
                        دیوار آرزوها ({wishes.length} پیام)
                      </h4>

                        {wishes.map((w) => (
                          <div
                            key={w.id}
                            className={`p-4 rounded-xl bg-slate-950/60 border text-right transition-all flex flex-col gap-1.5 ${
                              w.color === 'green' && 'border-emerald-500/30'
                            } ${w.color === 'blue' && 'border-sky-500/30'} ${
                              w.color === 'teal' && 'border-teal-500/30'
                            } ${w.color === 'turquoise' && 'border-cyan-500/30'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(w.timestamp).toLocaleTimeString('fa-IR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="font-sans font-black text-xs text-emerald-300 flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                                <span>{w.sender} تبریک می‌گه:</span>
                              </span>
                            </div>
                          <p className="font-sans text-xs text-slate-300 leading-relaxed text-justify whitespace-pre-line">
                            {w.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GIFT 3 CONTENT: BALLOON POP GAME */}
                {activeGift === 3 && <BalloonPopGame />}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/40 text-center">
                <span className="font-sans text-[10px] text-slate-500">
                  برای بازگشت به جشن، دکمه ضربدر یا بیرون پنجره را فشار دهید.
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
