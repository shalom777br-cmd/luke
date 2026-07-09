import React, { useEffect, useState, useMemo } from 'react';
import { 
  Github, 
  GitBranch, 
  Code2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  ArrowRight, 
  Star, 
  Cpu, 
  FileCode,
  Layers
} from 'lucide-react';

interface RepoStats {
  total_files: number;
  total_lines: number;
  total_todos: number;
  total_size_kb: number;
}

interface RepoModule {
  name: string;
  filePath: string;
  description: string;
  category: string;
  baseImportance: number;
  baseRelevance: number;
  defaultSuggested: string;
  exists: boolean;
  sizeKB: number;
  linesCount: number;
  todoCount: number;
  completionRate: number;
  todos: string[];
}

interface ApiResponse {
  success: boolean;
  repo_name: string;
  branch: string;
  stats: RepoStats;
  modules: RepoModule[];
}

interface GitHubRepoTasksProps {
  onAcceptDevTask: (taskName: string, explanation: string, filePath?: string, repoName?: string) => void;
  username?: string;
  repoName?: string;
  repos?: any[];
  onSelectRepo?: (repoName: string | null) => void;
}

export const GitHubRepoTasks: React.FC<GitHubRepoTasksProps> = ({ 
  onAcceptDevTask,
  username,
  repoName,
  repos,
  onSelectRepo
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<ApiResponse | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  // Fetch Repository State from server API
  const fetchRepoState = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = username && repoName
        ? `/api/github/repo-status?username=${encodeURIComponent(username)}&repo=${encodeURIComponent(repoName)}`
        : '/api/github/repo-status';
      const res = await fetch(url, {
        headers: {
          'X-Security-Token': (import.meta as any).env?.VITE_TIMOTHY_SECURITY_TOKEN || ''
        }
      });
      if (!res.ok) {
        throw new Error('サーバーからのリポジトリ解析データの取得に失敗しました。');
      }
      const data: ApiResponse = await res.json();
      if (data.success) {
        setRepoData(data);
      } else {
        throw new Error('リポジトリ解析が異常終了しました。');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'データ取得エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoState();
  }, [username, repoName]);

  // Calculate dynamic recommendations based on completion rate, importance, and relevance
  const recommendations = useMemo(() => {
    if (!repoData || !repoData.modules) return null;

    // Calculate priority scores: high importance, high relevance, lower completion rate = higher priority
    const scored = repoData.modules.map((mod) => {
      // Score formula: (importance * 3.5) + (relevance * 3.0) + ((100 - completion) * 0.2)
      let score = (mod.baseImportance * 3.5) + (mod.baseRelevance * 3.0) + ((100 - mod.completionRate) * 0.2);
      
      // 'src' フォルダまたは 'Source Code' カテゴリの src フォルダを最優先するためにブーストする
      if (mod.filePath === 'src' || mod.name.includes('src') || mod.name.includes('フォルダ「src」')) {
        score += 1000;
      }

      return {
        module: mod,
        score,
      };
    });

    // Sort by priority score descending
    scored.sort((a, b) => b.score - a.score);

    return {
      top: scored[0]?.module || null,
      runnerUp: scored[1]?.module || null,
      allScored: scored,
    };
  }, [repoData]);

  // Handle trigger proposal
  const triggerDevTask = (mod: RepoModule) => {
    const explanation = `テモテ推奨アクション: ${mod.defaultSuggested} (対象ファイル: ${mod.filePath} | 現在の完成率: ${mod.completionRate}% | 重要度★${mod.baseImportance})`;
    onAcceptDevTask(mod.name + ' の実装補強', explanation, mod.filePath, repoName || 'Local Project');
  };

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500 font-mono">
          リポジトリ構成 & TODOログをスキャン中...
        </span>
      </div>
    );
  }

  if (error || !repoData) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <h4 className="text-xs font-bold text-rose-800">リポジトリスキャン失敗</h4>
        <p className="text-[11px] text-rose-600 leading-normal">{error || '不明なエラーが発生しました。'}</p>
        <button
          onClick={fetchRepoState}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          再試行する
        </button>
      </div>
    );
  }

  const { repo_name, branch, stats, modules } = repoData;
  const bestTask = recommendations?.top;

  return (
    <div id="github-repo-tasks-panel" className="space-y-4">
      
      {/* Target Selector Dropdown */}
      {repos && repos.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <span className="font-bold text-slate-700">分析対象のリポジトリを選択:</span>
          <select
            value={repoName || ''}
            onChange={(e) => onSelectRepo?.(e.target.value || null)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">📁 ローカルプロジェクト環境 (本アプリ)</option>
            {repos.map((r) => (
              <option key={r.id || r.name} value={r.name}>
                🐙 {r.name} ({r.language || 'その他'})
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Repo Health & Info Summary Card */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-4.5 shadow-md border border-slate-800 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600/30 rounded-lg border border-indigo-500/20">
              <Github className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>{repo_name}</span>
              </h4>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 font-mono">
                <GitBranch className="h-3 w-3 text-emerald-400" />
                <span>{branch}</span>
              </div>
            </div>
          </div>

          <button
            onClick={fetchRepoState}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
            title="リポジトリを再読み込み"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Dynamic Micro-Stats Bar */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/40">
            <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-bold">ファイル数</span>
            <span className="text-xs font-extrabold text-indigo-300 font-mono mt-0.5 block">{stats.total_files} 個</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/40">
            <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-bold">総行数</span>
            <span className="text-xs font-extrabold text-teal-300 font-mono mt-0.5 block">{stats.total_lines.toLocaleString()} 行</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/40">
            <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-bold">残TODOs</span>
            <span className="text-xs font-extrabold text-rose-300 font-mono mt-0.5 block">{stats.total_todos} 件</span>
          </div>
        </div>
      </div>

      {/* Timothy Next Recommended Task (手のつけたらいいおすすめ) */}
      {bestTask && (
        <div className="bg-amber-50/75 border border-amber-200 rounded-2xl p-4.5 space-y-3.5 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-1.5 pb-2 border-b border-amber-200/50">
            <Sparkles className="h-4.5 w-4.5 text-amber-600 animate-pulse" />
            <span className="text-xs font-bold text-amber-900">
              秘書テモテの「次におすすめの開発タスク」提案 🎯
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {bestTask.name}
              </h5>
              <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold">
                最優先推奨
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed bg-white/70 p-3 rounded-xl border border-amber-100/50">
              <strong>テモテ分析:</strong> 「主よ、現在のリポジトリ内を監査した結果、こちらのモジュールは重要度 <strong>★{bestTask.baseImportance}</strong> と極めて高く、現在の想定完成率は <strong>{bestTask.completionRate}%</strong> に留まっています。開発効率を高めるため、まずは以下の補強を行うことをお勧めします。」
              <span className="block mt-2 text-indigo-700 font-bold bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/30">
                👉 {bestTask.defaultSuggested}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-slate-500">
                ファイル: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold">{bestTask.filePath}</code>
              </span>
            </div>

            <button
              type="button"
              onClick={() => triggerDevTask(bestTask)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-97 text-white text-[11px] font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>テモテに開発支援を指示する</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modules List / Dev Task Dashboard */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-indigo-600" />
          <span>リポジトリ構成モジュール一覧と開発ステータス ({modules.length}件):</span>
        </h4>

        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {modules.map((mod) => {
            const isExpanded = expandedModule === mod.name;
            const hasTodos = mod.todoCount > 0;
            
            // Completion rate color selection
            let progressColor = 'bg-rose-500';
            let textColor = 'text-rose-600';
            if (mod.completionRate >= 85) {
              progressColor = 'bg-emerald-500';
              textColor = 'text-emerald-600';
            } else if (mod.completionRate >= 60) {
              progressColor = 'bg-amber-500';
              textColor = 'text-amber-600';
            }

            return (
              <div 
                key={mod.name} 
                className={`bg-white border rounded-xl transition-all shadow-3xs overflow-hidden ${
                  isExpanded ? 'border-indigo-300 ring-1 ring-indigo-500/5' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Module Summary Header */}
                <div 
                  onClick={() => setExpandedModule(isExpanded ? null : mod.name)}
                  className="p-3.5 cursor-pointer select-none space-y-2"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                          {mod.category}
                        </span>
                        
                        {/* Importance badges */}
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-bold">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                          重要性: {mod.baseImportance}
                        </span>

                        {/* Relevance badges */}
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                          関連性: {mod.baseRelevance}
                        </span>
                      </div>
                      
                      <h5 className="text-xs font-bold text-slate-800 mt-1">
                        {mod.name}
                      </h5>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className={`text-xs font-extrabold font-mono ${textColor}`}>
                        {mod.completionRate}%
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {mod.linesCount} 行 / {mod.sizeKB} KB
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`} 
                      style={{ width: `${mod.completionRate}%` }} 
                    />
                  </div>

                  {/* Micro Indicators Footer */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                    <span className="font-mono truncate max-w-[190px]">
                      📂 {mod.filePath}
                    </span>
                    {hasTodos ? (
                      <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded flex items-center gap-0.5">
                        ⚠️ TODO: {mod.todoCount}件
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                        ✓ 正常
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-100 p-3.5 space-y-3 text-[11px]">
                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">説明</span>
                      <p className="text-slate-600 leading-normal font-sans">{mod.description}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">テモテ推奨の開発目標</span>
                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/60 leading-relaxed font-sans font-medium text-[10.5px]">
                        💡 {mod.defaultSuggested}
                      </p>
                    </div>

                    {/* Todos details if exists */}
                    {hasTodos && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-bold text-rose-500 uppercase tracking-wider block flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-rose-500" />
                          <span>ファイル内から検出された TODO/FIXME コメント:</span>
                        </span>
                        <div className="bg-rose-50/40 rounded-lg border border-rose-100 p-2.5 space-y-1.5 font-mono text-[9.5px] text-slate-600 overflow-x-auto max-h-28 overflow-y-auto">
                          {mod.todos.map((todo, idx) => (
                            <div key={idx} className="whitespace-pre truncate border-b border-rose-100/30 pb-1 last:border-0 last:pb-0">
                              {todo}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action button inside card */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => triggerDevTask(mod)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-97 text-[10.5px] font-extrabold rounded-lg border border-indigo-200/50 transition-colors cursor-pointer"
                      >
                        このタスクでテモテを支援させる
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
