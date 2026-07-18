import React, { useState } from 'react';
import { HeartHandshake, Sparkles, Send, Loader2, RotateCcw, Heart, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NoahCounselingProps {
  userId: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const NoahCounseling: React.FC<NoahCounselingProps> = ({ userId, showToast }) => {
  const [worryText, setWorryText] = useState('');
  const [shareHistory, setShareHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noahAnswer, setNoahAnswer] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worryText.trim()) {
      showToast('相談したい内容を少しでも入力してくださいね。', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/noah/counsel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          worry_text: worryText.trim(),
          share_history: shareHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('サーバーエラーが発生しました');
      }

      const data = await response.json();
      if (data.success && data.answer) {
        setNoahAnswer(data.answer);
        showToast('ノアがお返事をまとめました。', 'success');
      } else {
        throw new Error(data.error || 'お返事の取得に失敗しました');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'ノアにうまく繋がらなかったようです。少し時間を置いてみてくださいね。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setWorryText('');
    setNoahAnswer(null);
  };

  return (
    <div id="noah-counseling-panel" className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs space-y-4 relative overflow-hidden transition-all hover:shadow-sm">
      {/* Background glow effects */}
      <div className="absolute -top-10 -right-10 h-32 w-32 bg-rose-400/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-purple-400/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-rose-100 relative z-10">
        <div className="h-8 w-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
          <HeartHandshake className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>カウンセラー・ノアのお悩み相談室</span>
            <span className="text-[10px] font-normal bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full border border-rose-200">
              心のケア
            </span>
          </h3>
          <p className="text-[10px] text-slate-500">あなたの心と体のモヤモヤに、優しく寄り添います</p>
        </div>
      </div>

      {/* Intro prompt */}
      <AnimatePresence mode="wait">
        {!noahAnswer ? (
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10"
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="worry-text-area" className="sr-only">悩み・モヤモヤの内容</label>
                <textarea
                  id="worry-text-area"
                  rows={4}
                  value={worryText}
                  onChange={(e) => setWorryText(e.target.value)}
                  placeholder="例：最近なんだか眠りが浅くて、日中もすっきりしません。仕事のプレッシャーもあるのかなと感じています..."
                  className="w-full text-xs text-slate-800 placeholder-slate-400 bg-slate-50/80 rounded-xl p-3 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-rose-400 focus:border-rose-400 focus:bg-white transition-all resize-none leading-relaxed"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shareHistory}
                    onChange={(e) => setShareHistory(e.target.checked)}
                    className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 h-3.5 w-3.5"
                    disabled={isSubmitting}
                  />
                  <span>過去の体調・お悩みログをノアに共有する</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>ノアが心を受け止めています...</span>
                  </>
                ) : (
                  <>
                    <Heart className="h-3.5 w-3.5" />
                    <span>ノアにそっと打ち明ける</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="answer-display"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 relative z-10"
          >
            <div className="bg-rose-50/30 rounded-xl p-4 border border-rose-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                <HeartHandshake className="h-4 w-4" />
                <span>ノアからの温かいメッセージ:</span>
              </div>
              <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-medium bg-white/70 p-3.5 rounded-lg border border-rose-50 shadow-3xs">
                {noahAnswer}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 py-2.5 px-4 rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>もう一度ノアに相談する / 心を整理する</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
