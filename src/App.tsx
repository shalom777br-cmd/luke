import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Send,
  Search,
  Database,
  Sparkles,
  Cpu,
  Tag,
  Calendar,
  User,
  CheckCircle,
  CheckSquare,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Coins,
  Heart,
  BookOpen,
  CalendarDays,
  Smile,
  Check,
  Plus,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MemoryCategory,
  MemoryEntry,
  StructuredMemory,
  SearchFilters
} from './types';

// Supported profiles to showcase the "shared" context capability
const USER_PROFILES = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'テモテ共有コア (Timothee)', color: 'bg-emerald-500' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'CONCERTANTE 共同設計', color: 'bg-indigo-500' },
  { id: '00000000-0000-0000-0000-000000000003', name: '050Call 通話音声ログ', color: 'bg-amber-500' },
  { id: '00000000-0000-0000-0000-000000000004', name: '個人用メモレイヤー', color: 'bg-rose-500' }
];

const CATEGORY_DETAILS: Record<MemoryCategory, { label: string; icon: any; color: string; bg: string; border: string }> = {
  task: { label: 'タスク', icon: CheckSquare, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
  event: { label: '予定 / 出来事', icon: CalendarDays, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  note: { label: 'メモ / 考察', icon: BookOpen, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  health: { label: '健康 / 体調', icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  finance: { label: '会計 / 財務', icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  relationship: { label: '人間関係', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  faith: { label: '信仰 / 精神', icon: Smile, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  other: { label: 'その他', icon: Info, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' }
};

export default function App() {
  // Current user / profile select
  const [currentUser, setCurrentUser] = useState(USER_PROFILES[0]);
  
  // App system status
  const [systemStatus, setSystemStatus] = useState<{
    db_mode: string;
    active_llm_provider: string;
    secrets: {
      gemini_api_key_configured: boolean;
      anthropic_api_key_configured: boolean;
      supabase_configured: boolean;
    };
    table_status?: { exists: boolean; error: string | null };
  }>({
    db_mode: 'local',
    active_llm_provider: 'gemini',
    secrets: {
      gemini_api_key_configured: false,
      anthropic_api_key_configured: false,
      supabase_configured: false,
    }
  });

  // Ingestion states
  const [rawInput, setRawInput] = useState('');
  const [inputType, setInputType] = useState<'text' | 'voice'>('text');
  const [isIngesting, setIsIngesting] = useState(false);
  const [lastCompiledEntry, setLastCompiledEntry] = useState<MemoryEntry | null>(null);
  
  // Speech recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechFeedback, setSpeechFeedback] = useState('');

  // Search, filter & synthesis states
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [queryText, setQueryText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Retrieved entries and AI synthesis answer
  const [matchedEntries, setMatchedEntries] = useState<MemoryEntry[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | undefined>(undefined);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // UI Expand / collapse states
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Audio waveform animation helper
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 10, 20, 15, 30, 10, 25, 15, 10]);

  // Fetch diagnostics on mount
  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // Fetch entries and tags when user profile, filters, or lastCompiledEntry changes
  useEffect(() => {
    handleSearch();
    fetchTags();
  }, [currentUser, selectedCategory, selectedTags, dateFrom, dateTo]);

  // Handle Speech Recognition setup (safeguarded)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'ja-JP';

        rec.onstart = () => {
          setIsRecording(true);
          setSpeechFeedback('お話しください。音声をテキスト化しています...');
        };

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setRawInput((prev) => prev + finalTranscript);
          }
          if (interimTranscript) {
            setSpeechFeedback(`認識中: ${interimTranscript}`);
          }
        };

        rec.onerror = (err: any) => {
          console.error('Speech recognition error:', err);
          showToast('error', '音声認識に失敗、または許可されませんでした。');
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
          setSpeechFeedback('');
        };

        setRecognition(rec);
      }
    }
  }, []);

  // Waveform simulation
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setWaveHeights(waveHeights.map(() => Math.floor(Math.random() * 35) + 8));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording, waveHeights]);

  // Fetch system diagnostics status
  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const status = await res.json();
        setSystemStatus(status);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  // Fetch unique tags
  const fetchTags = async () => {
    try {
      const res = await fetch(`/api/tags?user_id=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  // Ingest Natural Language input
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) {
      showToast('error', '入力欄が空です。メッセージか音声を入力してください。');
      return;
    }

    setIsIngesting(true);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          input_type: inputType,
          raw_input: rawInput.trim(),
        }),
      });

      if (!res.ok) throw new Error('Ingest request failed');

      const data = await res.json();
      if (data.success) {
        setLastCompiledEntry(data.entry);
        setRawInput('');
        showToast('success', '記憶をコンパイルし、正常にデータベースに投入しました！');
        
        // Refresh entries and tags
        handleSearch();
        fetchTags();
      } else {
        throw new Error(data.error || 'Unknown ingestion error');
      }
    } catch (err) {
      console.error('Failed to ingest memory:', err);
      showToast('error', '記憶の投入に失敗しました。サーバー状況を確認してください。');
    } finally {
      setIsIngesting(false);
    }
  };

  // Handle Search and AI Synthesis
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
          query_text: queryText.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setMatchedEntries(data.entries || []);
      setAiAnswer(data.answer);

      if (queryText.trim() && data.answer) {
        showToast('info', 'AIが一致する記録から回答を合成しました。');
      }
    } catch (err) {
      console.error('Search failed:', err);
      showToast('error', '記憶の検索に失敗しました。');
    } finally {
      setIsSearching(false);
    }
  };

  // Reset Filters helper
  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    setQueryText('');
    setAiAnswer(undefined);
    showToast('info', '検索フィルタを初期化しました。');
  };

  // Toggle visual recorder using Web Speech API
  const handleToggleRecording = () => {
    if (!recognition) {
      showToast('info', 'お使いのブラウザはマイク音声の即時文字起こしに対応していません。キーボードの音声入力キー(マイクボタン)をご使用いただけます。');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      setInputType('voice');
      recognition.start();
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const toggleExpandEntry = (id: string) => {
    setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border text-sm max-w-md backdrop-blur-md"
            style={{
              backgroundColor:
                toastMessage.type === 'success'
                  ? 'rgba(240, 253, 244, 0.95)'
                  : toastMessage.type === 'error'
                  ? 'rgba(254, 242, 242, 0.95)'
                  : 'rgba(240, 249, 255, 0.95)',
              borderColor:
                toastMessage.type === 'success'
                  ? '#bbf7d0'
                  : toastMessage.type === 'error'
                  ? '#fecaca'
                  : '#bae6fd',
              color:
                toastMessage.type === 'success'
                  ? '#14532d'
                  : toastMessage.type === 'error'
                  ? '#7f1d1d'
                  : '#0c4a6e',
            }}
          >
            {toastMessage.type === 'success' && <Check className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
            {toastMessage.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />}
            {toastMessage.type === 'info' && <Sparkles className="h-5 w-5 text-sky-600 flex-shrink-0" />}
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Container */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium tracking-wider text-teal-600 uppercase bg-teal-50 px-2 py-0.5 rounded-md">ルカ / Memory Compiler</span>
              </div>
              <h1 className="text-lg font-sans font-bold text-slate-900 tracking-tight">AIに重要事項を覚えてもらうアプリ</h1>
            </div>
          </div>

          {/* Account Selector & Diagnostics Panel */}
          <div className="flex flex-wrap items-center gap-3 md:self-center">
            
            {/* Account Selector */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <User className="h-4 w-4 text-slate-500" />
              <span className="text-slate-500 mr-1">空間アカウント:</span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const prof = USER_PROFILES.find((p) => p.id === e.target.value);
                  if (prof) {
                    setCurrentUser(prof);
                    setSelectedTags([]);
                    showToast('info', `コンテキストを [${prof.name}] に切り替えました。`);
                  }
                }}
                className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {USER_PROFILES.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnostics Badge */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500">
              <Database className="h-3.5 w-3.5 text-teal-600" />
              <span className="font-mono text-[11px] uppercase">
                DB: <strong className="text-slate-700">{systemStatus.db_mode === 'supabase' ? 'Supabase' : 'ローカル保存'}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-mono text-[11px] uppercase">
                LLM: <strong className="text-slate-700">{systemStatus.active_llm_provider}</strong>
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Supabase Table Missing or Schema Mismatch Alert */}
        {systemStatus.db_mode === 'supabase' && systemStatus.table_status && (!systemStatus.table_status.exists || systemStatus.table_status.error === 'schema_invalid_user_id_uuid') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-amber-50 border border-amber-300 rounded-2xl shadow-xs"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-xl text-amber-800 flex-shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-sm font-bold text-amber-900">
                  {systemStatus.table_status.error === 'schema_invalid_user_id_uuid' 
                    ? '【重要】Supabase の user_id 列のデータ型修正が必要です' 
                    : '【重要】Supabase のテーブル設定が必要です'}
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {systemStatus.table_status.error === 'schema_invalid_user_id_uuid' ? (
                    <span>
                      Supabase内に <code>memory_entries</code> テーブルは存在しますが、<code>user_id</code> 列が <code>uuid</code> 型になっています。
                      本アプリは UUID 形式のプロファイル ID を使用することで、テーブル定義が <code>uuid</code> 型であっても <code>text</code> 型であっても正常に動作するように最適化されています。
                      安全のためにデータベース再接続や再確認を行ってください。
                    </span>
                  ) : (
                    <span>
                      Supabaseへの接続には成功していますが、データを格納するための <code>memory_entries</code> テーブルがデータベースに作成されていません。
                      そのため、現在は自動的に<strong>ローカル保存モード（データ損失を防ぐための一時保存）</strong>にフォールバックして動作しています。
                    </span>
                  )}
                </p>

                <div className="text-xs text-amber-900 font-medium pt-1">
                  解決方法: Supabaseのダッシュボードを開き、サイドバーの <strong>「SQL Editor」</strong>（クエリシート）で以下のSQLを貼り付けて実行（Run）してください。
                </div>

                {/* SQL Codeblock Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex justify-between items-center">
                      <span>方法A: 既存テーブルの型を変更（データを保持）</span>
                      <button
                        onClick={() => {
                          const sql = `alter table memory_entries alter column user_id type text;`;
                          navigator.clipboard.writeText(sql);
                          showToast('success', '方法AのSQLをコピーしました！');
                        }}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-semibold rounded transition-all active:scale-95"
                      >
                        コピー
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800 min-h-[80px]">
{`-- user_idカラムの型をuuidからtextに変更
alter table memory_entries 
  alter column user_id type text;`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex justify-between items-center">
                      <span>方法B: テーブルを再作成（データをリセット）</span>
                      <button
                        onClick={() => {
                          const sql = `-- テーブルを一度削除して再作成
drop table if exists memory_entries cascade;

create table memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  raw_input text not null,
  input_type text not null check (input_type in ('voice','text')),
  category text,
  summary text,
  structured jsonb not null,
  tags text[] default '{}',
  search_text text not null,
  importance smallint default 3,
  occurred_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_memory_entries_user on memory_entries (user_id);
create index if not exists idx_memory_entries_category on memory_entries (user_id, category);`;
                          navigator.clipboard.writeText(sql);
                          showToast('success', '方法BのSQLをコピーしました！');
                        }}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-semibold rounded transition-all active:scale-95"
                      >
                        コピー
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40 leading-relaxed border border-slate-800">
{`-- 1. テーブルを完全に再作成
drop table if exists memory_entries cascade;

create table memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  raw_input text not null,
  input_type text not null check (input_type in ('voice','text')),
  category text,
  summary text,
  structured jsonb not null,
  tags text[] default '{}',
  search_text text not null,
  importance smallint default 3,
  occurred_at timestamptz,
  created_at timestamptz default now()
);

-- 2. 検索用のインデックス作成
create index if not exists idx_memory_entries_user on memory_entries (user_id);
create index if not exists idx_memory_entries_category on memory_entries (user_id, category);`}
                    </pre>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pt-2 border-t border-amber-200">
                  <button
                    onClick={async () => {
                      await fetchSystemStatus();
                      await handleSearch();
                      showToast('info', 'データベース接続ステータスを再検証しました。');
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin-once" />
                    <span>実行完了後に再チェック</span>
                  </button>
                  <span className="text-[11px] text-amber-700">※SQL実行後、このボタンを押して状態を更新してください。</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side Panel - Ingestion (4 cols) */}
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
              
              {/* Decorative Accent Ring */}
              <div className="absolute top-0 right-0 h-28 w-28 bg-teal-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

              <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-4">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">自然言語 記憶投入ゲートウェイ</h2>
              </div>

              {/* Ingest Form */}
              <form onSubmit={handleIngest} className="space-y-4">
                
                {/* Method Toggles */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">入力ソース種別:</span>
                  <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setInputType('text')}
                      className={`px-3 py-1 rounded-md transition-all ${inputType === 'text' ? 'bg-white text-slate-900 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      テキスト入力
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputType('voice')}
                      className={`px-3 py-1 rounded-md transition-all ${inputType === 'voice' ? 'bg-white text-slate-900 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      音声ログ
                    </button>
                  </div>
                </div>

                {/* Main Textarea */}
                <div className="relative">
                  <textarea
                    rows={6}
                    value={rawInput}
                    onChange={(e) => {
                      setRawInput(e.target.value);
                      if (inputType === 'voice' && e.target.value && !isRecording) {
                        // Switch type if user starts typing manually in voice mode
                        setInputType('text');
                      }
                    }}
                    placeholder={
                      inputType === 'voice'
                        ? "【音声ログ入力】\n下のマイクボタンを押してしゃべるか、iOSキーボードの音声入力キー(マイク)を押して、記憶や予定を声でそのまま吹き込んでください。"
                        : "【自然言語テキスト】\n出来事やタスク、今日浮かんだひらめきなどを自由に入力してください。\n例：「明日15時に渋谷のカフェで高橋さんと打合せ。資料忘れずに。」"
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 resize-none leading-relaxed"
                  />

                  {/* Absolute Microphone Overlay Helper */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {recognition ? (
                      <button
                        type="button"
                        onClick={handleToggleRecording}
                        className={`p-2.5 rounded-full shadow-xs transition-all duration-300 flex items-center justify-center ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-100 animate-pulse'
                            : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                        }`}
                        title={isRecording ? '録音を停止' : 'マイク音声録音を開始'}
                      >
                        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1.5 border border-slate-200">
                        <Mic className="h-3 w-3" />
                        <span>音声キー推奨</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Voice Status Indicator and Simulated Wave */}
                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-teal-50/70 border border-teal-100 rounded-xl p-3 flex flex-col gap-2 overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-xs text-teal-700">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                          </span>
                          <span className="font-medium">音声集音中...</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRecording(false)}
                          className="text-teal-500 hover:text-teal-700 font-medium"
                        >
                          完了
                        </button>
                      </div>
                      
                      {/* Live Text Transcript */}
                      <p className="text-xs text-slate-600 line-clamp-1 italic font-medium bg-white px-2 py-1 rounded border border-teal-50">
                        {speechFeedback}
                      </p>

                      {/* Visual Waveform Simulation */}
                      <div className="flex items-end justify-center gap-1 h-8 pt-1">
                        {waveHeights.map((h, i) => (
                          <div
                            key={i}
                            className="w-1 bg-teal-500 rounded-full transition-all duration-100"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ingestion Info Box */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex gap-2.5 text-xs text-slate-500">
                  <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">自動構造化機能:</span>
                    <p className="mt-0.5 leading-relaxed">
                      AIが内容を分析し、最適なカテゴリ、日本語の要約、重要度(1-5)、行動の要不要、重要エンティティ、タグを自動で切り出します。
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRawInput('');
                      showToast('info', 'クリアしました。');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
                  >
                    入力をリセット
                  </button>
                  <button
                    type="submit"
                    disabled={isIngesting || !rawInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-teal-600/10 active:scale-98"
                  >
                    {isIngesting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>コンパイル中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>記憶に書き込む</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Compiled Entry Detail Display Card (Slide-In) */}
            <AnimatePresence>
              {lastCompiledEntry && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white rounded-2xl border border-teal-200 p-6 shadow-sm ring-1 ring-teal-500/10 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-indigo-500" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        コンパイル完了
                      </span>
                      {lastCompiledEntry.structured.action_required && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm animate-pulse">
                          ACTION REQ
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setLastCompiledEntry(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Summary Title */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {lastCompiledEntry.summary}
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {lastCompiledEntry.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">推定カテゴリ</span>
                      <div className="flex items-center gap-1.5 mt-0.5 font-medium text-slate-800">
                        {(() => {
                          const Icon = CATEGORY_DETAILS[lastCompiledEntry.category]?.icon || Info;
                          return (
                            <>
                              <Icon className="h-3.5 w-3.5 text-teal-600" />
                              <span>{CATEGORY_DETAILS[lastCompiledEntry.category]?.label || lastCompiledEntry.category}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">推定日付 / 予定</span>
                      <div className="flex items-center gap-1.5 mt-0.5 font-medium text-slate-800">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {lastCompiledEntry.occurred_at
                            ? new Date(lastCompiledEntry.occurred_at).toLocaleDateString('ja-JP', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '未指定'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Entities Box */}
                  <div className="bg-slate-50 rounded-xl p-3 mt-4 text-xs space-y-2 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">抽出エンティティ (Comprehension)</span>
                    <div className="space-y-1.5 pt-1">
                      {lastCompiledEntry.structured.entities.people.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-sm font-bold text-[10px]">人物</span>
                          <span className="text-slate-700">{lastCompiledEntry.structured.entities.people.join(', ')}</span>
                        </div>
                      )}
                      {lastCompiledEntry.structured.entities.places.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded-sm font-bold text-[10px]">場所</span>
                          <span className="text-slate-700">{lastCompiledEntry.structured.entities.places.join(', ')}</span>
                        </div>
                      )}
                      {lastCompiledEntry.structured.entities.dates.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-sm font-bold text-[10px]">時代表現</span>
                          <span className="text-slate-700">{lastCompiledEntry.structured.entities.dates.join(', ')}</span>
                        </div>
                      )}
                      {lastCompiledEntry.structured.entities.people.length === 0 &&
                        lastCompiledEntry.structured.entities.places.length === 0 &&
                        lastCompiledEntry.structured.entities.dates.length === 0 && (
                          <p className="text-slate-400 italic">抽出された固有名詞はありません</p>
                        )}
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </section>

          {/* Right Side Panel - Search Gateway & Stream (7 cols) */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* Search Gateway Control Board */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">共有記憶層 自然言語照会・抽出</h2>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>条件クリア</span>
                </button>
              </div>

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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
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

              {/* Advanced Tags and Date filters in expandable Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                
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
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all flex items-center gap-0.5 ${
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

              </div>

            </div>

            {/* AI Synthesized Answer Presentation (if query requested) */}
            <AnimatePresence>
              {aiAnswer && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-indigo-950"
                >
                  {/* Backdrop glowing bubbles */}
                  <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 h-28 w-28 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-3.5 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                        <Sparkles className="h-4 w-4 text-amber-300" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">ルカ AI 記憶要約・応答</span>
                    </div>
                    <button
                      onClick={() => setAiAnswer(undefined)}
                      className="text-indigo-200 hover:text-white transition-colors"
                      title="回答を閉じる"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-sm leading-relaxed relative z-10 whitespace-pre-wrap text-indigo-50">
                    {aiAnswer}
                  </div>

                  {/* Highlight box */}
                  <div className="mt-4 pt-3 border-t border-indigo-800/60 flex items-center gap-2 text-xs text-indigo-300 relative z-10">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-300 flex-shrink-0" />
                    <span>この回答は、絞り込まれた {matchedEntries.length} 件の歴史的記憶データを分析して合成されました。</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ingested Stream Results list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  記憶ログ一覧 ({matchedEntries.length}件)
                </span>
                <span className="text-xs text-slate-400">
                  空間: {currentUser.name}
                </span>
              </div>

              {matchedEntries.length > 0 ? (
                <div className="space-y-3.5">
                  {matchedEntries.map((entry) => {
                    const details = CATEGORY_DETAILS[entry.category] || CATEGORY_DETAILS.other;
                    const Icon = details.icon;
                    const isExpanded = !!expandedEntries[entry.id];
                    const hasEntities =
                      entry.structured.entities.people.length > 0 ||
                      entry.structured.entities.places.length > 0 ||
                      entry.structured.entities.dates.length > 0;

                    return (
                      <motion.div
                        key={entry.id}
                        layout="position"
                        className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all duration-200 relative overflow-hidden ${
                          entry.structured.action_required ? 'border-amber-200 ring-1 ring-amber-500/5' : 'border-slate-200'
                        }`}
                      >
                        {/* Action Required background stripe decoration */}
                        {entry.structured.action_required && (
                          <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
                        )}

                        <div className="flex items-start justify-between gap-3">
                          
                          {/* Left: Category Badge & Title */}
                          <div className="space-y-1">
                            
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Category pill */}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${details.bg} ${details.color} border ${details.border}`}>
                                <Icon className="h-3 w-3" />
                                <span>{details.label}</span>
                              </span>

                              {/* Action Required badge */}
                              {entry.structured.action_required && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wide">
                                  アクション要
                                </span>
                              )}

                              {/* Importance stars */}
                              <span className="text-slate-300 text-xs font-mono font-medium flex items-center">
                                {'★'.repeat(entry.importance)}
                                <span className="text-slate-200 font-normal">
                                  {'★'.repeat(Math.max(0, 5 - entry.importance))}
                                </span>
                              </span>
                            </div>

                            {/* Summary Title */}
                            <h3 className="text-sm font-bold text-slate-900 leading-snug mt-1.5">
                              {entry.summary}
                            </h3>

                          </div>

                          {/* Right: Date occur */}
                          <div className="text-right text-[11px] text-slate-400 font-mono whitespace-nowrap">
                            <span>
                              {entry.occurred_at
                                ? new Date(entry.occurred_at).toLocaleDateString('ja-JP', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : new Date(entry.created_at).toLocaleDateString('ja-JP', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                            </span>
                          </div>

                        </div>

                        {/* Collapsible Source text detail */}
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExpandEntry(entry.id)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition-colors"
                          >
                            <span>原文ログ・メタデータ</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden pt-2 space-y-3"
                              >
                                {/* Raw Input */}
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                                  {entry.raw_input}
                                </div>

                                {/* Comprehensive Tags inside raw list */}
                                {entry.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {entry.tags.map((tag, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleTagClick(tag)}
                                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-all border ${
                                          selectedTags.includes(tag)
                                            ? 'bg-teal-600 text-white border-teal-600 font-semibold'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                        }`}
                                      >
                                        #{tag}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Entities Grid inside expander */}
                                {hasEntities && (
                                  <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-lg p-2.5 text-[11px] space-y-1">
                                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">AI抽出 エンティティ分析:</span>
                                    <div className="space-y-1">
                                      {entry.structured.entities.people.length > 0 && (
                                        <div className="flex gap-1.5">
                                          <span className="text-slate-400">人物:</span>
                                          <span className="text-slate-700 font-medium">{entry.structured.entities.people.join(', ')}</span>
                                        </div>
                                      )}
                                      {entry.structured.entities.places.length > 0 && (
                                        <div className="flex gap-1.5">
                                          <span className="text-slate-400">場所:</span>
                                          <span className="text-slate-700 font-medium">{entry.structured.entities.places.join(', ')}</span>
                                        </div>
                                      )}
                                      {entry.structured.entities.dates.length > 0 && (
                                        <div className="flex gap-1.5">
                                          <span className="text-slate-400">時代表現:</span>
                                          <span className="text-slate-700 font-medium">{entry.structured.entities.dates.join(', ')}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                  <Database className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p>一致する記憶データが見つかりませんでした。</p>
                  <p className="text-xs text-slate-400 mt-1">
                    入力欄から新しい出来事や予定、考え事を登録してコンパイルしてください。
                  </p>
                </div>
              )}
            </div>

          </section>

        </div>
      </main>

      {/* Footer System Details */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 space-y-2">
          <p>© 2026 共有記憶層作成システム『ルカ』 - Memory Compiler. All rights reserved.</p>
          <div className="flex items-center justify-center gap-3 text-[11px]">
            <span>スキーマ: v1.0.0 (互換設計)</span>
            <span>•</span>
            <span className="flex items-center gap-1 justify-center">
              <span className={`h-1.5 w-1.5 rounded-full ${systemStatus.secrets.gemini_api_key_configured ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
              Gemini API: {systemStatus.secrets.gemini_api_key_configured ? '有効' : '未設定(ローカル代替)'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 justify-center">
              <span className={`h-1.5 w-1.5 rounded-full ${systemStatus.secrets.supabase_configured ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              Supabase: {systemStatus.secrets.supabase_configured ? '接続中' : '未接続(ローカル代替)'}
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
