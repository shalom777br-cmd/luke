import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  RefreshCw,
  Database,
  Tag,
  Calendar,
  Star,
  Plus,
  AlertTriangle,
  Copy,
  Check,
  Info,
  BookOpen,
  CalendarDays,
  Heart,
  Sparkles,
  CheckSquare,
  Activity,
  Coins
} from 'lucide-react';
import { MemoryCategory, MemoryEntry } from '../types';

const CATEGORY_DETAILS: Record<MemoryCategory, { label: string; icon: any; color: string; bg: string; border: string }> = {
  task: { label: 'タスク', icon: CheckSquare, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
  event: { label: '予定 / 出来事', icon: CalendarDays, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  note: { label: 'メモ / 考察', icon: BookOpen, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  health: { label: '健康 / 体調 / お悩み', icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  finance: { label: '会計 / 財務', icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  relationship: { label: '人間関係', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  faith: { label: '価値観、精神、信仰', icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  other: { label: 'その他', icon: Info, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' }
};

interface SharedMemorySearchProps {
  // Personal search props
  activeSearchTab: 'personal' | 'public';
  setActiveSearchTab: (tab: 'personal' | 'public') => void;
  queryText: string;
  setQueryText: (text: string) => void;
  isSearching: boolean;
  handleSearch: (e: React.FormEvent) => void;
  selectedCategory: MemoryCategory | 'all';
  setSelectedCategory: (cat: MemoryCategory | 'all') => void;
  matchedEntries: MemoryEntry[];
  availableTags: string[];
  selectedTags: string[];
  handleTagClick: (tag: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
  minImportance: number;
  setMinImportance: (val: number) => void;
  clearFilters: () => void;

  // Public search props
  publicQueryText: string;
  setPublicQueryText: (text: string) => void;
  isSearchingPublic: boolean;
  handleSearchPublic: (e?: React.FormEvent) => void;
  publicSearchCategory: MemoryCategory | 'all';
  setPublicSearchCategory: (cat: MemoryCategory | 'all') => void;
  showPublishForm: boolean;
  setShowPublishForm: (show: boolean) => void;
  pubTitle: string;
  setPubTitle: (t: string) => void;
  pubAuthor: string;
  setPubAuthor: (a: string) => void;
  pubCategory: MemoryCategory;
  setPubCategory: (cat: MemoryCategory) => void;
  pubTags: string;
  setPubTags: (t: string) => void;
  pubContent: string;
  setPubContent: (c: string) => void;
  handlePublishPublic: (e: React.FormEvent) => void;
  isPublishingPublic: boolean;
  publicMemories: any[];
  isPublicTableMissing: boolean;
  isPublicColumnMissing: boolean;
  handleImportPublicMemory: (pub: any) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SharedMemorySearch: React.FC<SharedMemorySearchProps> = ({
  activeSearchTab,
  setActiveSearchTab,
  queryText,
  setQueryText,
  isSearching,
  handleSearch,
  selectedCategory,
  setSelectedCategory,
  matchedEntries,
  availableTags,
  selectedTags,
  handleTagClick,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  minImportance,
  setMinImportance,
  clearFilters,

  publicQueryText,
  setPublicQueryText,
  isSearchingPublic,
  handleSearchPublic,
  publicSearchCategory,
  setPublicSearchCategory,
  showPublishForm,
  setShowPublishForm,
  pubTitle,
  setPubTitle,
  pubAuthor,
  setPubAuthor,
  pubCategory,
  setPubCategory,
  pubTags,
  setPubTags,
  pubContent,
  setPubContent,
  handlePublishPublic,
  isPublishingPublic,
  publicMemories,
  isPublicTableMissing,
  isPublicColumnMissing,
  handleImportPublicMemory,
  showToast
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">共有記憶層 自然言語照会・抽出</h2>
        </div>
        <button
          onClick={clearFilters}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          <span>条件クリア</span>
        </button>
      </div>

      {/* Tab Selector for Personal vs Public Search */}
      <div className="flex border-b border-slate-100 -mt-2">
        <button
          type="button"
          onClick={() => setActiveSearchTab('personal')}
          className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
            activeSearchTab === 'personal'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          マイ記憶層を照会 (個人)
        </button>
        <button
          type="button"
          onClick={() => setActiveSearchTab('public')}
          className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
            activeSearchTab === 'public'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Supabase公開共有記憶層を照会 (パブリック)
        </button>
      </div>

      {activeSearchTab === 'personal' ? (
        <div className="space-y-5">
          {/* Natural Language Question Field */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="「先月の健康状態の記録を教えて」「渋谷での予定はある？」"
              className="w-full rounded-xl border border-slate-200 pl-4 pr-12 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-55 flex items-center justify-center active:scale-95 shadow-sm"
              title="検索してAIに質問"
            >
              {isSearching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </form>

          {/* Interactive Category Pills list */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              <span>カテゴリ絞り込み:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                すべて ({matchedEntries.length})
              </button>
              {Object.entries(CATEGORY_DETAILS).map(([key, details]) => {
                const typedKey = key as MemoryCategory;
                const Icon = details.icon;
                const isSelected = selectedCategory === typedKey;
                
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(typedKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? `${details.bg} ${details.color} border ${details.border} font-semibold ring-1 ring-offset-0 ring-current`
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{details.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Tags, Date, and Importance filters in expandable Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
            
            {/* Available tags chips list */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                <span>登録済みタグ:</span>
              </label>
              {availableTags.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagClick(tag)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all flex items-center gap-0.5 cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span>#{tag}</span>
                        {isSelected && <Check className="h-2.5 w-2.5 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">タグがありません。記憶を追加してください。</p>
              )}
            </div>

            {/* Date range picker bounds */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>出来事の日程範囲:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 bg-slate-50/50 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 bg-slate-50/50 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Importance Rating filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                <span>重要度フィルタ (★の数):</span>
              </label>
              <div className="flex flex-col gap-1.5">
                <select
                  id="importance-filter-select"
                  value={minImportance}
                  onChange={(e) => setMinImportance(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-slate-50/50 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer transition-colors"
                >
                  <option value={0}>すべて表示 (★0〜5)</option>
                  <option value={1}>★1 以上のみ表示</option>
                  <option value={2}>★2 以上のみ表示</option>
                  <option value={3}>★3 以上のみ表示 (重要度:中+)</option>
                  <option value={4}>★4 以上のみ表示 (重要度:高)</option>
                  <option value={5}>★5 のみ表示 (最重要)</option>
                </select>
                
                {/* Interactive Star Buttons */}
                <div className="flex items-center gap-1 mt-0.5 justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">クイック選択:</span>
                  <div className="flex items-center gap-0.5">
                    {[0, 1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMinImportance(val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all duration-150 cursor-pointer ${
                          minImportance === val
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                      >
                        {val === 0 ? '全' : `★${val}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Public Search Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSearchPublic(); }} className="relative">
            <input
              type="text"
              value={publicQueryText}
              onChange={(e) => setPublicQueryText(e.target.value)}
              placeholder="公開共有記憶からキーワード検索 (例: 防災, NISA, AI)"
              className="w-full rounded-xl border border-slate-200 pl-4 pr-12 py-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 font-medium"
            />
            <button
              type="submit"
              disabled={isSearchingPublic}
              className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-55 flex items-center justify-center active:scale-95 shadow-xs cursor-pointer"
              title="公開記憶を検索"
            >
              {isSearchingPublic ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </button>
          </form>

          {/* Public Category Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="h-3.5 w-3.5" />
                <span>公開カテゴリ絞り込み:</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPublishForm(!showPublishForm)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>{showPublishForm ? "閉じる" : "共有記憶を公開投稿する"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setPublicSearchCategory('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  publicSearchCategory === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                すべて
              </button>
              {Object.entries(CATEGORY_DETAILS).map(([key, details]) => {
                const typedKey = key as MemoryCategory;
                const isSelected = publicSearchCategory === typedKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPublicSearchCategory(typedKey)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{details.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expandable Publish Form */}
          <AnimatePresence>
            {showPublishForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handlePublishPublic}
                className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3"
              >
                <div className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>新規公開共有記憶の投稿</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      タイトル
                    </label>
                    <input
                      type="text"
                      required
                      value={pubTitle}
                      onChange={(e) => setPubTitle(e.target.value)}
                      placeholder="例: 防災マニュアル2026"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      投稿者名
                    </label>
                    <input
                      type="text"
                      value={pubAuthor}
                      onChange={(e) => setPubAuthor(e.target.value)}
                      placeholder="例: 防災推進サークル"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      カテゴリ
                    </label>
                    <select
                      value={pubCategory}
                      onChange={(e) => setPubCategory(e.target.value as MemoryCategory)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 cursor-pointer font-semibold"
                    >
                      {Object.entries(CATEGORY_DETAILS).map(([key, details]) => (
                        <option key={key} value={key}>
                          {details.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      タグ (カンマ区切り)
                    </label>
                    <input
                      type="text"
                      value={pubTags}
                      onChange={(e) => setPubTags(e.target.value)}
                      placeholder="防災, 安全, ガイド"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    内容
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={pubContent}
                    onChange={(e) => setPubContent(e.target.value)}
                    placeholder="有益な情報やパブリックに共有したいノウハウ、全体計画などをご入力ください。"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPublishForm(false)}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishingPublic}
                    className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    {isPublishingPublic ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>登録中...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        <span>公開共有記憶に登録</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Public Memories Result List */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>公開共有記憶の検出結果 ({publicMemories.length}件)</span>
              <button
                type="button"
                onClick={() => handleSearchPublic()}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-bold cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>最新化</span>
              </button>
            </div>

            {isPublicTableMissing && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-800 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Supabase: memories テーブルが見つかりません</p>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5 animate-pulse">
                      ローカルデータベースにフォールバックしていますが、Supabaseを完全に活用するには以下のSQLをSupabaseのSQL Editorで実行してテーブルを作成してください。
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed select-all">
{`CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  author_name TEXT
);

-- RLSを有効化
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON memories FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON memories FOR INSERT WITH CHECK (true);`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const sqlText = `CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  author_name TEXT
);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON memories FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON memories FOR INSERT WITH CHECK (true);`;
                      navigator.clipboard.writeText(sqlText);
                      showToast('success', 'SQLをクリップボードにコピーしました！');
                    }}
                    className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    <span>コピー</span>
                  </button>
                </div>
              </div>
            )}

            {isPublicColumnMissing && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-800 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Supabase: memories テーブルに occurred_at カラムがありません</p>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5 animate-pulse">
                      自動的にインメモリソートにフォールバックしていますが、機能をフルに活用するには以下のSQLをSupabaseのSQL Editorで実行してカラムを追加してください。
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed select-all">
{`ALTER TABLE memories ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ DEFAULT NOW();`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const sqlText = `ALTER TABLE memories ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ DEFAULT NOW();`;
                      navigator.clipboard.writeText(sqlText);
                      showToast('success', 'SQLをクリップボードにコピーしました！');
                    }}
                    className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    <span>コピー</span>
                  </button>
                </div>
              </div>
            )}

            {publicMemories.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {publicMemories.map((pub) => {
                  const catDetails = CATEGORY_DETAILS[pub.category as MemoryCategory] || CATEGORY_DETAILS.other;
                  const CatIcon = catDetails.icon;
                  return (
                    <div
                      key={pub.id}
                      className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 transition-all relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${catDetails.bg} ${catDetails.color} border ${catDetails.border}`}>
                              <CatIcon className="h-3 w-3" />
                              {catDetails.label}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{pub.title}</h4>
                          </div>
                          {pub.author_name && (
                            <span className="text-[10px] text-slate-400 block font-medium">
                              公開元: <span className="text-slate-600 font-semibold">{pub.author_name}</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleImportPublicMemory(pub)}
                          className="px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-600 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>マイ記憶へ追加</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium bg-white/60 p-2 rounded-lg border border-slate-100/60 whitespace-pre-wrap">{pub.content}</p>

                      {pub.tags && pub.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {pub.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50/30 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                <Database className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                <p>該当する公開共有記憶はありません。</p>
                <p className="text-[10px] text-slate-400 mt-0.5">別のキーワードやカテゴリを試すか、新規に投稿してください。</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
