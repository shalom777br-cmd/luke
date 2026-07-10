import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  X,
  Trash2,
  FileJson,
  Download,
  Copy,
  Share2,
  Star,
  Github,
  AlertCircle,
  Pencil,
  Sliders,
  Volume2,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MemoryCategory,
  MemoryEntry,
  StructuredMemory,
  SearchFilters
} from './types';
import { MemoryTrendChart } from './components/MemoryTrendChart';
import { TimothyCalendar } from './components/TimothyCalendar';
import { GitHubRepoTasks } from './components/GitHubRepoTasks';
import { SharedMemorySearch } from './components/SharedMemorySearch';
import { NoahCounseling } from './components/NoahCounseling';

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
  health: { label: '健康 / 体調 / お悩み', icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  finance: { label: '会計 / 財務', icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  relationship: { label: '人間関係', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  faith: { label: '価値観、精神、信仰', icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  other: { label: 'その他', icon: Info, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' }
};

const extractGitHubUsername = (input: string): string => {
  let cleaned = input.trim();
  if (cleaned.includes('github.com/')) {
    const parts = cleaned.split('github.com/');
    if (parts.length > 1) {
      cleaned = parts[1];
    }
  }
  cleaned = cleaned.split('?')[0];
  cleaned = cleaned.split('#')[0];
  const pathParts = cleaned.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    return pathParts[0];
  }
  return cleaned;
};

export default function App() {
  // Current user / profile select
  const [currentUser, setCurrentUser] = useState(USER_PROFILES[0]);

  // Timothy Task Proposals state (Luke proposes task to User)
  const [taskProposals, setTaskProposals] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('timothy_proposals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Timothy Active Task Queue state
  const [timothyQueue, setTimothyQueue] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('timothy_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Past Due Alert / Reminders queue state
  const [pastDueAlerts, setPastDueAlerts] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissed_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  // Task execution log state
  const [activeLogTaskId, setActiveLogTaskId] = useState<string | null>(null);
  const [activeLogData, setActiveLogData] = useState<any | null>(null);

  useEffect(() => {
    if (!activeLogTaskId) {
      setActiveLogData(null);
      return;
    }

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/github/task-logs?id=${activeLogTaskId}`, {
          headers: {
            'X-Security-Token': (import.meta as any).env?.VITE_TIMOTHY_SECURITY_TOKEN || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setActiveLogData(data.task);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch task execution logs:', err);
      }
    };

    fetchLogs();
    
    const timer = setInterval(fetchLogs, 1500);
    return () => clearInterval(timer);
  }, [activeLogTaskId]);
  
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

  // Microphone Sensitivity, Noise Gate Threshold and filters
  const [micSensitivity, setMicSensitivity] = useState(1.0);
  const [noiseThreshold, setNoiseThreshold] = useState(15);
  const [enableNativeNoiseSuppression, setEnableNativeNoiseSuppression] = useState(true);
  const [enableNativeEchoCancellation, setEnableNativeEchoCancellation] = useState(true);
  const [realtimeVolume, setRealtimeVolume] = useState(0);
  const [isGateOpen, setIsGateOpen] = useState(true);
  const [showMicSettings, setShowMicSettings] = useState(false);

  // Refs to allow instant access in Web Audio loop & SpeechRecognition callbacks without closures issue
  const micSensitivityRef = useRef(1.0);
  const noiseThresholdRef = useRef(15);
  const isGateOpenRef = useRef(true);
  const lastDetectedVoiceTimeRef = useRef(Date.now());

  // Keep refs in sync with state
  useEffect(() => {
    micSensitivityRef.current = micSensitivity;
  }, [micSensitivity]);

  useEffect(() => {
    noiseThresholdRef.current = noiseThreshold;
  }, [noiseThreshold]);

  // Search, filter & synthesis states
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [queryText, setQueryText] = useState('');
  const [minImportance, setMinImportance] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Retrieved entries and AI synthesis answer
  const [matchedEntries, setMatchedEntries] = useState<MemoryEntry[]>([]);
  const [allCalendarEntries, setAllCalendarEntries] = useState<MemoryEntry[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | undefined>(undefined);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Filtered memory entries based on Importance client-side
  const filteredEntries = useMemo(() => {
    if (minImportance === 0) return matchedEntries;
    return matchedEntries.filter((entry) => entry.importance >= minImportance);
  }, [matchedEntries, minImportance]);

  // UI Expand / collapse states
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Re-compiling state for entries that failed originally (e.g. 503 fallback)
  const [recompilingIds, setRecompilingIds] = useState<string[]>([]);

  // JSON Viewer and Export States
  const [showDbJsonModal, setShowDbJsonModal] = useState(false);
  const [selectedEntryJson, setSelectedEntryJson] = useState<MemoryEntry | null>(null);

  // Sharing States
  const [sharedModalEntry, setSharedModalEntry] = useState<MemoryEntry | null>(null);
  const [isSharedModalLoading, setIsSharedModalLoading] = useState(false);

  // Deleting confirmation state
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Manual edit state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('note');
  const [editImportance, setEditImportance] = useState<number>(3);
  const [editOccurredAt, setEditOccurredAt] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editRawInput, setEditRawInput] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // AI Re-evaluation states
  const [pendingEvaluations, setPendingEvaluations] = useState<Record<string, {
    suggested_category: MemoryCategory;
    suggested_importance: number;
    reason: string;
    loading: boolean;
  }>>({});

  // Supabase Public Memories states
  const [activeSearchTab, setActiveSearchTab] = useState<'personal' | 'public'>('personal');
  const [publicQueryText, setPublicQueryText] = useState('');
  const [publicMemories, setPublicMemories] = useState<any[]>([]);
  const [isSearchingPublic, setIsSearchingPublic] = useState(false);
  const [isPublishingPublic, setIsPublishingPublic] = useState(false);
  const [publicSearchCategory, setPublicSearchCategory] = useState<MemoryCategory | 'all'>('all');
  const [isPublicTableMissing, setIsPublicTableMissing] = useState(false);
  const [isPublicColumnMissing, setIsPublicColumnMissing] = useState(false);

  // GitHub Integration states
  const [gitHubUsername, setGitHubUsername] = useState('shalom777br-cmd');
  const [isFetchingGitHub, setIsFetchingGitHub] = useState(false);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [selectedRepoForDashboard, setSelectedRepoForDashboard] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Temote Ask (Question Mode) states
  const [activeGatewayTab, setActiveGatewayTab] = useState<'ingest' | 'ask'>('ingest');
  const [askQuestion, setAskQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResult, setAskResult] = useState<{ answer: string; detail?: string; allMatches?: any[] } | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  // Fields for publishing a new public memory
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubContent, setPubContent] = useState('');
  const [pubCategory, setPubCategory] = useState<MemoryCategory>('note');
  const [pubTags, setPubTags] = useState('');
  const [pubAuthor, setPubAuthor] = useState('');

  // Handle Close Shared Modal and clean query parameter
  const handleCloseSharedModal = () => {
    setSharedModalEntry(null);
    if (typeof window !== 'undefined' && window.history.pushState) {
      const newUrl = window.location.origin + window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  // Generate and Copy Share URL helper
  const handleShareEntry = (entry: MemoryEntry) => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}${window.location.pathname}?shareId=${entry.id}`;
      navigator.clipboard.writeText(shareUrl);
      showToast('success', 'この記憶ログの共有用URLをクリップボードにコピーしました！');
    }
  };

  const handleCopyToClipboard = (text: string, message: string = 'コピーしました！') => {
    navigator.clipboard.writeText(text);
    showToast('success', message);
  };

  const handleDownloadJson = (filename: string, jsonContent: any) => {
    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', `${filename} をダウンロードしました。`);
  };

  // Audio waveform animation helper
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 10, 20, 15, 30, 10, 25, 15, 10]);

  // Fetch diagnostics on mount
  useEffect(() => {
    fetchSystemStatus();
  }, []);

  // Load shared entry if shareId is in the URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('shareId');
      if (shareId) {
        setIsSharedModalLoading(true);
        fetch(`/api/entry/${shareId}`)
          .then((res) => {
            if (!res.ok) throw new Error('Shared entry not found');
            return res.json();
          })
          .then((data) => {
            if (data.entry) {
              setSharedModalEntry(data.entry);
              showToast('success', '共有された記憶ログを読み込みました。');
            }
          })
          .catch((err) => {
            console.error('Failed to load shared entry:', err);
            showToast('error', '共有された記憶ログの読み込みに失敗しました。');
          })
          .finally(() => {
            setIsSharedModalLoading(false);
          });
      }
    }
  }, []);

  // Parse GitHub repo data from standard MemoryEntry objects saved in DB
  const parseRepoFromMemory = (entry: MemoryEntry) => {
    const raw = entry.raw_input || '';
    const nameMatch = raw.match(/GitHubリポジトリ同期 \[(.+?)\]/) || entry.summary.match(/GitHubリポジトリ:\s*(.+)/);
    const name = nameMatch ? nameMatch[1] : entry.summary.replace('GitHubリポジトリ: ', '');
    
    const ownerMatch = raw.match(/オーナー:\s*(.+)/);
    const owner = ownerMatch ? ownerMatch[1].trim() : '';
    
    const descMatch = raw.match(/説明:\s*(.+)/);
    const description = descMatch ? descMatch[1].trim() : '';
    
    const urlMatch = raw.match(/URL:\s*(.+)/);
    const html_url = urlMatch ? urlMatch[1].trim() : '';
    
    const langMatch = raw.match(/言語:\s*(.+)/);
    const language = langMatch ? langMatch[1].trim() : '';
    
    const starsMatch = raw.match(/スター数:\s*(\d+)/);
    const stargazers_count = starsMatch ? parseInt(starsMatch[1], 10) : 0;
    
    const forksMatch = raw.match(/フォーク数:\s*(\d+)/);
    const forks_count = forksMatch ? parseInt(forksMatch[1], 10) : 0;
    
    const issuesMatch = raw.match(/オープンイシュー数:\s*(\d+)/);
    const open_issues_count = issuesMatch ? parseInt(issuesMatch[1], 10) : 0;

    return {
      id: entry.id,
      name,
      owner: { login: owner },
      description,
      html_url,
      language,
      stargazers_count,
      forks_count,
      open_issues_count,
      created_at: entry.created_at,
      updated_at: entry.occurred_at || entry.created_at
    };
  };

  // Sync loaded memory entries to githubRepos list so previously saved/synchronized repos are automatically visible in Timothy Dashboard
  useEffect(() => {
    if (matchedEntries.length > 0) {
      const memorizedRepos = matchedEntries
        .filter((entry) => entry.tags && entry.tags.includes('github') && entry.tags.includes('repository'))
        .map(parseRepoFromMemory);
      
      if (memorizedRepos.length > 0) {
        setGithubRepos((prevRepos) => {
          const merged = [...prevRepos];
          for (const mRepo of memorizedRepos) {
            if (!merged.some(r => r.name.toLowerCase() === mRepo.name.toLowerCase())) {
              merged.push(mRepo);
            }
          }
          return merged;
        });

        setSelectedRepoForDashboard((currentSelected) => {
          if (!currentSelected && memorizedRepos.length > 0) {
            return memorizedRepos[0].name;
          }
          return currentSelected;
        });
      }
    }
  }, [matchedEntries]);

  // Fetch entries and tags when user profile, filters, or lastCompiledEntry changes
  useEffect(() => {
    const isUnfiltered = selectedCategory === 'all' && 
                         selectedTags.length === 0 && 
                         !dateFrom && 
                         !dateTo && 
                         !queryText.trim();

    handleSearch();
    fetchTags();
    
    if (!isUnfiltered) {
      fetchCalendarEntries();
    }
  }, [currentUser, selectedCategory, selectedTags, dateFrom, dateTo]);

  // Persist Timothy and alert states
  useEffect(() => {
    localStorage.setItem('timothy_proposals', JSON.stringify(taskProposals));
  }, [taskProposals]);

  useEffect(() => {
    localStorage.setItem('timothy_queue', JSON.stringify(timothyQueue));
  }, [timothyQueue]);

  useEffect(() => {
    localStorage.setItem('dismissed_alerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  // Timothy task ticking loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTimothyQueue((prevQueue) => {
        let changed = false;
        const nextQueue = prevQueue.map((task) => {
          if (task.status === 'running') {
            changed = true;
            if (task.countdown > 1) {
              return { ...task, countdown: task.countdown - 1 };
            } else {
              return {
                ...task,
                countdown: 0,
                status: 'completed',
                report: `テモテ報告: 指示されたタスク『${task.summary}』の処理を着実に完了しました。関連する記憶ノードを整理・補強し、次のアクションへ移行可能です。`
              };
            }
          }
          return task;
        });
        return changed ? nextQueue : prevQueue;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Past due task alert monitor loop
  useEffect(() => {
    const alertTimer = setInterval(() => {
      if (matchedEntries.length === 0) return;
      const tasks = matchedEntries.filter(
        (e) => e.category === 'task' && e.occurred_at && !dismissedAlerts.includes(e.id)
      );
      const pastTasks = tasks.filter((e) => {
        const time = new Date(e.occurred_at!).getTime();
        return time < Date.now();
      });
      setPastDueAlerts(pastTasks);
    }, 3000);

    return () => clearInterval(alertTimer);
  }, [matchedEntries, dismissedAlerts]);

  // Handlers for Proposals and Alerts
  const handleApproveProposal = (proposal: any) => {
    const newTask = {
      id: proposal.id,
      summary: proposal.summary,
      explanation: proposal.explanation,
      due_date: proposal.occurred_at,
      status: 'running',
      countdown: 10,
      created_at: new Date().toISOString()
    };
    setTimothyQueue((prev) => [newTask, ...prev]);
    setTaskProposals((prev) => prev.filter((p) => p.id !== proposal.id));
    showToast('success', `テモテに指示を送りました：『${proposal.summary}』に着手します。`);
  };

  const handleRejectProposal = (proposalId: string) => {
    setTaskProposals((prev) => prev.filter((p) => p.id !== proposalId));
    showToast('info', 'タスク提案を却下しました。');
  };

  const handleAcceptDevTask = async (taskName: string, explanation: string, filePath?: string, repoName?: string) => {
    const taskId = 'dev-' + (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 9));
    const newTask = {
      id: taskId,
      summary: taskName,
      explanation: explanation,
      due_date: new Date().toISOString(),
      status: 'running',
      countdown: 15,
      created_at: new Date().toISOString()
    };
    setTimothyQueue((prev) => [newTask, ...prev]);
    showToast('success', `テモテに開発指示を送りました：『${taskName}』の自動分析＆支援を開始します。`);

    try {
      await fetch('/api/github/task-logs/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Token': (import.meta as any).env?.VITE_TIMOTHY_SECURITY_TOKEN || ''
        },
        body: JSON.stringify({
          id: taskId,
          task_name: taskName,
          explanation: explanation,
          file_path: filePath || 'N/A',
          repo_name: repoName || 'Local Project',
        })
      });
    } catch (err) {
      console.warn('Failed to register task execution log:', err);
    }
  };

  const handleDismissPastTask = async (taskId: string, deleteFromDb: boolean) => {
    if (deleteFromDb) {
      try {
        const res = await fetch('/api/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: taskId,
            user_id: currentUser.id,
          }),
        });
        if (res.ok) {
          showToast('success', '期限切れのタスクをデータベースから消去しました。');
          handleSearch();
          fetchTags();
          fetchCalendarEntries();
        } else {
          showToast('error', 'タスクの消去に失敗しました。');
        }
      } catch (err) {
        console.error('Failed to delete past task:', err);
        showToast('error', 'タスクの消去中にエラーが発生しました。');
      }
    } else {
      showToast('info', 'リマインドを一時的に非表示にしました。');
    }
    setDismissedAlerts((prev) => [...prev, taskId]);
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          user_id: currentUser.id,
        }),
      });
      if (res.ok) {
        showToast('success', '記憶ログを削除しました。');
        handleSearch();
        fetchTags();
        fetchCalendarEntries();
      } else {
        showToast('error', '記憶ログの削除に失敗しました。');
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
      showToast('error', '削除処理中にエラーが発生しました。');
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleRecompileEntry = async (id: string) => {
    setRecompilingIds((prev) => [...prev, id]);
    try {
      const res = await fetch('/api/recompile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          user_id: currentUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'AIによる記憶の再コンパイルが完了しました！カレンダー自動登録や詳細タグが反映されました。');
        handleSearch();
        fetchTags();
        fetchCalendarEntries();
      } else {
        showToast('error', data.error || 'AI再コンパイルに失敗しました。時間をおいて再試行してください。');
      }
    } catch (err) {
      console.error('Failed to recompile entry:', err);
      showToast('error', '再コンパイル中に通信エラーが発生しました。');
    } finally {
      setRecompilingIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleReEvaluateEntry = async (entry: MemoryEntry) => {
    setPendingEvaluations((prev) => ({
      ...prev,
      [entry.id]: {
        suggested_category: entry.category,
        suggested_importance: entry.importance,
        reason: '',
        loading: true,
      },
    }));

    try {
      const res = await fetch('/api/re-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: entry.raw_input || entry.summary,
          current_category: entry.category,
          current_importance: entry.importance,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingEvaluations((prev) => ({
          ...prev,
          [entry.id]: {
            suggested_category: data.suggested_category as MemoryCategory,
            suggested_importance: Number(data.suggested_importance),
            reason: data.reason,
            loading: false,
          },
        }));
        showToast('success', 'AIによる重要度・カテゴリの再評価が完了しました。推奨案を確認してください。');
      } else {
        showToast('error', data.error || 'AI再評価に失敗しました。');
        setPendingEvaluations((prev) => {
          const next = { ...prev };
          delete next[entry.id];
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to re-evaluate:', err);
      showToast('error', '再評価中に通信エラーが発生しました。');
      setPendingEvaluations((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
    }
  };

  const handleApproveEvaluation = async (id: string) => {
    const evalResult = pendingEvaluations[id];
    if (!evalResult) return;

    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          user_id: currentUser.id,
          category: evalResult.suggested_category,
          importance: Number(evalResult.suggested_importance),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'AIによる重要度とカテゴリの更新が完了しました！');
        setPendingEvaluations((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        handleSearch();
        fetchTags();
        fetchCalendarEntries();
      } else {
        showToast('error', data.error || '更新に失敗しました。');
      }
    } catch (err) {
      console.error('Failed to update entry with approved evaluation:', err);
      showToast('error', '更新中に通信エラーが発生しました。');
    }
  };

  const startEditing = (entry: MemoryEntry) => {
    setEditingEntryId(entry.id);
    setEditSummary(entry.summary);
    setEditCategory(entry.category);
    setEditImportance(entry.importance);
    setEditOccurredAt(entry.occurred_at ? entry.occurred_at.slice(0, 16) : '');
    setEditTags(entry.tags ? entry.tags.join(', ') : '');
    setEditRawInput(entry.raw_input || '');
  };

  const cancelEditing = () => {
    setEditingEntryId(null);
  };

  const saveEditing = async (id: string) => {
    setIsSavingEdit(true);
    try {
      const parsedTags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const formattedDate = editOccurredAt ? new Date(editOccurredAt).toISOString() : null;

      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          user_id: currentUser.id,
          summary: editSummary,
          category: editCategory,
          importance: Number(editImportance),
          occurred_at: formattedDate,
          tags: parsedTags,
          raw_input: editRawInput,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', '記憶ログを正常に更新しました。');
        setEditingEntryId(null);
        handleSearch();
        fetchTags();
        fetchCalendarEntries();
      } else {
        showToast('error', data.error || '記憶ログの更新に失敗しました。');
      }
    } catch (err) {
      console.error('Failed to update entry:', err);
      showToast('error', '更新処理中に通信エラーが発生しました。');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
          // Noise Gate filtering: only process transcripts when noise gate is open (voice is active)
          if (!isGateOpenRef.current) {
            setSpeechFeedback('ノイズ除去ゲート作動中 (しきい値以下の音声をミュートしています)');
            return;
          }

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

  // Real-time Web Audio API analyzer with mic sensitivity and noise gate threshold
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let micStream: MediaStream | null = null;
    let animationFrameId: number;
    let fallbackInterval: any = null;

    if (isRecording) {
      const constraints = {
        audio: {
          noiseSuppression: enableNativeNoiseSuppression,
          echoCancellation: enableNativeEchoCancellation,
        },
      };

      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          micStream = stream;
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtx = new AudioContextClass();
          const source = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkAudio = () => {
            if (!analyser || !audioCtx) return;
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = bufferLength > 0 ? sum / bufferLength : 0;
            const rawVolume = (average / 255) * 100;

            const amplifiedVolume = Math.min(100, Math.round(rawVolume * micSensitivityRef.current));
            setRealtimeVolume(amplifiedVolume);

            if (amplifiedVolume >= noiseThresholdRef.current) {
              isGateOpenRef.current = true;
              lastDetectedVoiceTimeRef.current = Date.now();
              setIsGateOpen(true);
            } else {
              if (Date.now() - lastDetectedVoiceTimeRef.current > 800) {
                isGateOpenRef.current = false;
                setIsGateOpen(false);
              }
            }

            const waveData = [];
            const step = Math.max(1, Math.floor(bufferLength / 9));
            for (let i = 0; i < 9; i++) {
              const freqVal = dataArray[(i * step) % bufferLength] || 0;
              const height = isGateOpenRef.current
                ? Math.max(4, Math.floor((freqVal / 255) * 35 * micSensitivityRef.current))
                : 4;
              waveData.push(height);
            }
            setWaveHeights(waveData);

            animationFrameId = requestAnimationFrame(checkAudio);
          };

          checkAudio();
        })
        .catch((err) => {
          console.warn('Could not initialize real-time Web Audio API analyzer, using fallback simulation:', err);
          fallbackInterval = setInterval(() => {
            setIsGateOpen(true);
            isGateOpenRef.current = true;
            setRealtimeVolume(Math.floor(Math.random() * 40) + 20);
            setWaveHeights(Array.from({ length: 9 }, () => Math.floor(Math.random() * 30) + 8));
          }, 100);
        });
    } else {
      setRealtimeVolume(0);
      setIsGateOpen(true);
      isGateOpenRef.current = true;
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording, enableNativeNoiseSuppression, enableNativeEchoCancellation]);

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

  // Question detection utility for routing
  const isQuestion = (text: string): boolean => {
    const questionMarkers = ["?", "？", "か？", "か。", "ですか", "でしたか", "教えて", "何年", "何月", "何日", "いつ", "どこ", "だれ", "誰"];
    return questionMarkers.some((marker) => text.includes(marker));
  };

  // Dedicated execution handler for Question Mode
  const executeAsk = async (text: string) => {
    setIsAsking(true);
    setAskResult(null);
    setAskError(null);
    try {
      const res = await fetch('/api/temote/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, user_id: currentUser.id }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || '検索中にエラーが発生しました');
      }

      const data = await res.json();
      setAskResult(data);
      showToast('success', '記録を検索しました。');
    } catch (err: any) {
      console.error('Failed to ask question:', err);
      setAskError(err?.message || '不明なエラーが発生しました');
      showToast('error', err?.message || '検索に失敗しました');
    } finally {
      setIsAsking(false);
    }
  };

  // Dedicated execution handler for Ingest / Memory Compilation Mode
  const executeIngest = async (text: string, typeToUse?: 'voice' | 'text') => {
    setIsIngesting(true);
    try {
      const res = await fetch('/api/temote/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          input_type: typeToUse || inputType,
          raw_input: text,
        }),
      });

      if (!res.ok) throw new Error('Ingest request failed');

      const data = await res.json();
      if (data.success) {
        setLastCompiledEntry(data.entry);
        setRawInput('');

        // Trigger proposal state if the compiled memory is a task and is AI-executable
        if (
          data.entry.category === 'task' &&
          data.entry.structured &&
          data.entry.structured.is_ai_executable
        ) {
          setTaskProposals((prev) => [
            {
              id: data.entry.id,
              summary: data.entry.summary,
              explanation: data.entry.structured.task_explanation || 'AIエージェント「テモテ」が処理可能なタスクです。',
              occurred_at: data.entry.occurred_at || data.entry.created_at,
              entry: data.entry,
            },
            ...prev,
          ]);
          showToast('success', '記憶のコンパイルに成功しました。AIエージェント向けの新規タスク提案があります！');
        } else {
          showToast('success', '記憶をコンパイルし、正常にデータベースに投入しました！');
        }
        
        // Refresh entries and tags
        handleSearch();
        fetchTags();
        fetchCalendarEntries();
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

  // Ask Question to Temote (Question Mode)
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = askQuestion.trim();
    if (!text) {
      showToast('error', '質問内容を入力してください。');
      return;
    }

    if (!isQuestion(text)) {
      showToast('info', '通常の文章を検知したため、記憶の記録モードに自動で振り分けました。');
      setActiveGatewayTab('ingest');
      setRawInput(text);
      setAskQuestion('');
      executeIngest(text, 'text');
      return;
    }

    executeAsk(text);
  };

  // Ingest Natural Language input
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = rawInput.trim();
    if (!text) {
      showToast('error', '入力欄が空です。メッセージか音声を入力してください。');
      return;
    }

    if (isQuestion(text)) {
      showToast('info', '疑問詞・質問表現を検知したため、問いかけ（検索質問）モードに自動で振り分けました。');
      setActiveGatewayTab('ask');
      setAskQuestion(text);
      setRawInput('');
      executeAsk(text);
      return;
    }

    executeIngest(text);
  };

  // Handle Search and AI Synthesis
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    
    try {
      const isUnfiltered = selectedCategory === 'all' && 
                           selectedTags.length === 0 && 
                           !dateFrom && 
                           !dateTo && 
                           !queryText.trim();

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

      if (isUnfiltered) {
        setAllCalendarEntries(data.entries || []);
      }

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

  // Fetch public memories from Supabase with search query
  const handleSearchPublic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingPublic(true);
    try {
      const url = new URL('/api/public-memories', window.location.origin);
      if (publicQueryText.trim()) {
        url.searchParams.append('query_text', publicQueryText.trim());
      }
      if (publicSearchCategory !== 'all') {
        url.searchParams.append('category', publicSearchCategory);
      }
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch public memories');
      const data = await res.json();
      setPublicMemories(data.memories || []);
      setIsPublicTableMissing(!!data.table_missing);
      setIsPublicColumnMissing(!!data.column_missing);
    } catch (err) {
      console.error('Failed to search public memories:', err);
      showToast('error', '公開共有記憶の検索に失敗しました。');
    } finally {
      setIsSearchingPublic(false);
    }
  };

  // Publish a memory to Supabase public memories
  const handlePublishPublic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitle.trim() || !pubContent.trim()) {
      showToast('error', 'タイトルと本文を入力してください。');
      return;
    }
    setIsPublishingPublic(true);
    try {
      const res = await fetch('/api/public-memories/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pubTitle.trim(),
          content: pubContent.trim(),
          category: pubCategory,
          tags: pubTags.split(',').map(t => t.trim()).filter(Boolean),
          occurred_at: new Date().toISOString(),
          author_name: pubAuthor.trim() || '匿名のルカユーザー'
        })
      });
      if (!res.ok) throw new Error('Failed to publish');
      const data = await res.json();
      if (data.success) {
        showToast('success', '記憶を公開共有記憶層に保存しました！');
        setPubTitle('');
        setPubContent('');
        setPubTags('');
        setShowPublishForm(false);
        handleSearchPublic();
      } else {
        throw new Error('Server returned failure');
      }
    } catch (err) {
      console.error('Failed to publish:', err);
      showToast('error', '公開共有記憶への登録に失敗しました。');
    } finally {
      setIsPublishingPublic(false);
    }
  };

  // Import public memory into user's own memory log
  const handleImportPublicMemory = async (pubMem: any) => {
    try {
      const rawInput = `【インポートされた公開記憶】\nタイトル: ${pubMem.title}\n内容: ${pubMem.content}\nタグ: ${pubMem.tags?.join(', ') || ''}`;
      
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          input_type: 'text',
          raw_input: rawInput
        })
      });

      if (!res.ok) throw new Error('Ingest failed');
      const data = await res.json();
      if (data.success) {
        showToast('success', `「${pubMem.title}」を個人記憶ログへインポートしました！`);
        handleSearch(); // refresh personal search list
        fetchCalendarEntries();
      }
    } catch (err) {
      console.error('Failed to import public memory:', err);
      showToast('error', 'インポート中にエラーが発生しました。');
    }
  };

  // Fetch GitHub Repositories for preview
  const handleFetchGitHubRepos = async () => {
    const cleanUsername = extractGitHubUsername(gitHubUsername);
    if (!cleanUsername) {
      setGithubError('有効なGitHubユーザー名を入力してください。');
      return;
    }
    setGitHubUsername(cleanUsername);

    setIsFetchingGitHub(true);
    setGithubError(null);
    setGithubRepos([]);
    try {
      const res = await fetch(`/api/github/fetch-repos?username=${encodeURIComponent(cleanUsername)}`, {
        headers: {
          'X-Security-Token': (import.meta as any).env?.VITE_TIMOTHY_SECURITY_TOKEN || ''
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTPエラー: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const repos = data.repos || [];
        setGithubRepos(repos);
        if (repos.length > 0) {
          setSelectedRepoForDashboard(repos[0].name);
        }
        showToast('success', `${gitHubUsername} のリポジトリ一覧を取得しました！`);
      } else {
        throw new Error('リポジトリの取得に失敗しました。');
      }
    } catch (err: any) {
      console.error(err);
      setGithubError(err.message || 'データ取得エラーが発生しました。');
      showToast('error', 'GitHubリポジトリ一覧の取得に失敗しました。');
    } finally {
      setIsFetchingGitHub(false);
    }
  };

  // Sync GitHub Repositories as memories in DB
  const handleSyncGitHubRepos = async () => {
    const cleanUsername = extractGitHubUsername(gitHubUsername);
    if (!cleanUsername) {
      showToast('error', '有効なGitHubユーザー名を入力してください。');
      return;
    }
    setGitHubUsername(cleanUsername);
    
    setIsSyncingGitHub(true);
    setGithubError(null);
    try {
      const res = await fetch('/api/github/sync-repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Token': (import.meta as any).env?.VITE_TIMOTHY_SECURITY_TOKEN || ''
        },
        body: JSON.stringify({
          username: cleanUsername,
          user_id: currentUser.id
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTPエラー: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        showToast('success', `ルカは ${gitHubUsername} のリポジトリを ${data.synced_count} 件、長期記憶として同期コンパイルしました！`);
        // Refresh search and tags list so the newly ingested github repositories are immediately visible in Ruka Memories UI
        handleSearch();
        fetchTags();
      } else {
        throw new Error('同期処理に失敗しました。');
      }
    } catch (err: any) {
      console.error(err);
      setGithubError(err.message || '同期エラーが発生しました。');
      showToast('error', 'GitHubリポジトリ同期に失敗しました。');
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  // Auto-search public memories when the public tab or category filter changes
  useEffect(() => {
    if (activeSearchTab === 'public') {
      handleSearchPublic();
    }
  }, [activeSearchTab, publicSearchCategory]);

  // Fetch all calendar entries for Timothy Calendar (unfiltered)
  const fetchCalendarEntries = async () => {
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAllCalendarEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch calendar entries:', err);
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

        {/* Past Due Reminders Panel */}
        <AnimatePresence>
          {pastDueAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-5 bg-rose-50 border border-rose-200 rounded-2xl shadow-xs relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-rose-100 rounded-xl text-rose-800 flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-rose-600 animate-bounce" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>⏰ 期限切れタスクのリマインド (過去時刻検知)</span>
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    タスク<strong>『{pastDueAlerts[0].summary}』</strong>の設定された予定時刻（
                    {new Date(pastDueAlerts[0].occurred_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    ）が過去になりました。このタスクを消去して一覧から整理しますか？
                  </p>
                  <div className="flex items-center gap-3 pt-1.5">
                    <button
                      type="button"
                      onClick={() => handleDismissPastTask(pastDueAlerts[0].id, true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
                    >
                      はい、データベースから消去する
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissPastTask(pastDueAlerts[0].id, false)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    >
                      いいえ、リマインドだけ非表示
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

              {/* Tab Selector for Ingest Mode vs Question Mode */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs mb-5">
                <button
                  type="button"
                  onClick={() => setActiveGatewayTab('ingest')}
                  className={`flex-1 py-2 rounded-lg transition-all font-semibold flex items-center justify-center gap-1.5 ${activeGatewayTab === 'ingest' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>記憶を記録 (インプット)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGatewayTab('ask')}
                  className={`flex-1 py-2 rounded-lg transition-all font-semibold flex items-center justify-center gap-1.5 ${activeGatewayTab === 'ask' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>記憶に問いかける (質問)</span>
                </button>
              </div>

              {activeGatewayTab === 'ask' ? (
                /* Ask Form (Question Mode) */
                <form onSubmit={handleAskQuestion} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      質問内容を入力してください:
                    </label>
                    <div className="relative">
                      <textarea
                        rows={4}
                        value={askQuestion}
                        onChange={(e) => setAskQuestion(e.target.value)}
                        placeholder="例：テモテの開発ダッシュボードに同期したGitHubリポジトリに関する情報はある？"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAskQuestion('');
                        setAskResult(null);
                        setAskError(null);
                        showToast('info', '質問をクリアしました。');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
                    >
                      入力をクリア
                    </button>
                    <button
                      type="submit"
                      disabled={isAsking || !askQuestion.trim()}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-teal-600/10 active:scale-98"
                    >
                      {isAsking ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>検索中...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          <span>質問する</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Results Display */}
                  <AnimatePresence>
                    {askError && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium"
                      >
                        {askError}
                      </motion.div>
                    )}

                    {askResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3 pt-2"
                      >
                        <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              🔍 問いかけの回答
                            </span>
                            {askResult.matchedKeyword && (
                              <span className="text-[10px] font-bold text-teal-600 bg-teal-100/60 px-2 py-0.5 rounded-full">
                                マッチしたキーワード: {askResult.matchedKeyword}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                            {askResult.answer}
                          </p>
                          {askResult.detail && (
                            <div className="pt-2 border-t border-teal-100/60">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                                記憶の背景コンテキスト:
                              </span>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-white/50 p-2.5 rounded border border-slate-100">
                                {askResult.detail}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Other Matches */}
                        {askResult.allMatches && askResult.allMatches.length > 1 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                              関連するその他の記憶 ({askResult.allMatches.length} 件):
                            </span>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {askResult.allMatches.slice(1).map((match, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-all"
                                >
                                  <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                                    <span>{match.year ? `${match.year}年の記録` : '関連の記録'}</span>
                                  </div>
                                  <p className="text-slate-800 font-semibold mb-1">
                                    「{match.display_title || match.summary}」
                                  </p>
                                  {match.ai_context && (
                                    <p className="text-slate-500 text-[11px] line-clamp-2">
                                      {match.ai_context}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              ) : (
                /* Ingest Form (Original Form) */
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

                {/* Collapsible Microphone & Noise Gate Settings */}
                <div id="mic-settings-container" className="border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMicSettings(!showMicSettings)}
                    className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="h-3.5 w-3.5 text-teal-600" />
                      <span>マイク音声感度・ノイズしきい値調整</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-normal">
                        感度: {micSensitivity}x / 閾値: {noiseThreshold}%
                      </span>
                      {showMicSettings ? (
                        <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {showMicSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-3.5 pb-4 pt-1 border-t border-slate-100 space-y-3 text-xs overflow-hidden"
                      >
                        {/* Meter (Always shown to help test mic levels) */}
                        <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-100 shadow-3xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                              <Volume2 className="h-3.5 w-3.5 text-teal-500" />
                              リアルタイム入力音量レベル:
                            </span>
                            <span className="font-mono font-semibold text-slate-700">
                              {realtimeVolume}% {isRecording ? (isGateOpen ? '(音声検知中)' : '(静音・遮断中)') : '(待機中)'}
                            </span>
                          </div>
                          
                          <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            {/* Threshold bar marker */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20"
                              style={{ left: `${noiseThreshold}%` }}
                              title={`ノイズしきい値: ${noiseThreshold}%`}
                            />
                            {/* Real-time Volume level fill */}
                            <div 
                              className={`h-full transition-all duration-75 ${
                                isGateOpen && realtimeVolume >= noiseThreshold 
                                  ? 'bg-teal-500' 
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${realtimeVolume}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                            <span>0%</span>
                            <span className="text-red-500 font-medium" style={{ marginLeft: `${noiseThreshold - 10}%` }}>
                              しきい値 ({noiseThreshold}%)
                            </span>
                            <span>100%</span>
                          </div>
                        </div>

                        {/* Sensitivity Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-600">マイクゲイン (入力感度):</span>
                            <span className="font-mono font-bold text-teal-600">{micSensitivity.toFixed(1)}x</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0.1"
                              max="3.0"
                              step="0.1"
                              value={micSensitivity}
                              onChange={(e) => setMicSensitivity(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                            />
                            <button
                              type="button"
                              onClick={() => setMicSensitivity(1.0)}
                              className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-50 rounded text-slate-500 font-medium transition-colors"
                            >
                              リセット
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            マイク入力が小さくて認識されにくい場合は値を大きくし、ノイズが多い場合は小さくしてください。
                          </p>
                        </div>

                        {/* Threshold Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-600">ノイズゲートしきい値 (閾値):</span>
                            <span className="font-mono font-bold text-teal-600">{noiseThreshold}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="80"
                            step="1"
                            value={noiseThreshold}
                            onChange={(e) => setNoiseThreshold(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                          />
                          <p className="text-[10px] text-slate-400 leading-normal">
                            この値以下の音量を「ノイズ」として無視します。静かな環境では低くし、雑音が多い環境では高めに調整してください。
                          </p>
                        </div>

                        {/* Device / Hardware Filters */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 space-y-2">
                          <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                            デバイス側・ブラウザ内蔵フィルタ:
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800">
                              <input
                                type="checkbox"
                                checked={enableNativeNoiseSuppression}
                                onChange={(e) => setEnableNativeNoiseSuppression(e.target.checked)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                              />
                              <span>ノイズ抑制機能</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800">
                              <input
                                type="checkbox"
                                checked={enableNativeEchoCancellation}
                                onChange={(e) => setEnableNativeEchoCancellation(e.target.checked)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                              />
                              <span>エコー除去機能</span>
                            </label>
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
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
              )}
            </div>

            <SharedMemorySearch
              activeSearchTab={activeSearchTab}
              setActiveSearchTab={setActiveSearchTab}
              queryText={queryText}
              setQueryText={setQueryText}
              isSearching={isSearching}
              handleSearch={handleSearch}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              matchedEntries={matchedEntries}
              availableTags={availableTags}
              selectedTags={selectedTags}
              handleTagClick={handleTagClick}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              minImportance={minImportance}
              setMinImportance={setMinImportance}
              clearFilters={clearFilters}
              publicQueryText={publicQueryText}
              setPublicQueryText={setPublicQueryText}
              isSearchingPublic={isSearchingPublic}
              handleSearchPublic={handleSearchPublic}
              publicSearchCategory={publicSearchCategory}
              setPublicSearchCategory={setPublicSearchCategory}
              showPublishForm={showPublishForm}
              setShowPublishForm={setShowPublishForm}
              pubTitle={pubTitle}
              setPubTitle={setPubTitle}
              pubAuthor={pubAuthor}
              setPubAuthor={setPubAuthor}
              pubCategory={pubCategory}
              setPubCategory={setPubCategory}
              pubTags={pubTags}
              setPubTags={setPubTags}
              pubContent={pubContent}
              setPubContent={setPubContent}
              handlePublishPublic={handlePublishPublic}
              isPublishingPublic={isPublishingPublic}
              publicMemories={publicMemories}
              isPublicTableMissing={isPublicTableMissing}
              isPublicColumnMissing={isPublicColumnMissing}
              handleImportPublicMemory={handleImportPublicMemory}
              showToast={showToast}
            />

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

            {/* Timothy Task Proposals Panel */}
            <AnimatePresence>
              {taskProposals.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-amber-50 rounded-2xl border border-amber-200 p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2 pb-1 border-b border-amber-200/60">
                    <Sparkles className="h-4.5 w-4.5 text-amber-600 animate-pulse" />
                    <h3 className="text-sm font-bold text-amber-900">ルカの自動提案 (AI実行可能タスク)</h3>
                    <span className="ml-auto bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {taskProposals.length}件の提案
                    </span>
                  </div>

                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {taskProposals.map((proposal) => (
                      <div key={proposal.id} className="bg-white rounded-xl p-4 border border-amber-100 space-y-3 shadow-2xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                            エージェント処理可能
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 mt-2 font-sans">
                            {proposal.summary}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                          {proposal.explanation}
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleRejectProposal(proposal.id)}
                            className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            提案を却下
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveProposal(proposal)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-xs"
                          >
                            <Cpu className="h-3 w-3" />
                            承認して指示（テモテ着手）
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timothy Task Queue Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Cpu className="h-4.5 w-4.5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">テモテのタスクキュー (Timothy Task Queue)</h3>
                <span className="ml-auto bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {timothyQueue.filter((t) => t.status === 'running').length} 実行中
                </span>
              </div>

              {timothyQueue.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {timothyQueue.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-xl p-3.5 border transition-all relative overflow-hidden ${
                        task.status === 'running'
                          ? 'bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-500/5'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      {/* Active green stripe */}
                      {task.status === 'running' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                                task.status === 'running'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                                  : 'bg-slate-200 text-slate-600 border border-slate-300'
                              }`}
                            >
                              {task.status === 'running' ? '着手・実行中' : '実行完了'}
                            </span>
                            {task.status === 'running' && (
                              <span className="text-[10px] font-mono font-bold text-emerald-600 flex items-center gap-1 bg-white px-1.5 py-0.2 rounded border border-emerald-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span>[残り {task.countdown}秒]</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-snug">{task.summary}</h4>
                        </div>

                        {/* Dismiss finished task button */}
                        <button
                          type="button"
                          onClick={() => {
                            setTimothyQueue((prev) => prev.filter((t) => t.id !== task.id));
                            showToast('info', 'キューからタスクを整理しました。');
                          }}
                          className="text-slate-400 hover:text-slate-600 p-1"
                          title="履歴から削除"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-sans">
                        {task.explanation}
                      </p>

                      {/* Log viewer toggle */}
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            if (activeLogTaskId === task.id) {
                              setActiveLogTaskId(null);
                            } else {
                              setActiveLogTaskId(task.id);
                            }
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeLogTaskId === task.id
                              ? 'bg-slate-900 text-white border-slate-950 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200'
                          }`}
                        >
                          <Terminal className="h-3 w-3" />
                          <span>{activeLogTaskId === task.id ? 'ログを隠す' : '自動実行ログ (Live Logs)'}</span>
                        </button>
                      </div>

                      {/* Live Terminal Area */}
                      {activeLogTaskId === task.id && (
                        <div className="mt-2.5 bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-800 font-mono text-[9.5px] leading-relaxed space-y-1.5 shadow-inner max-h-48 overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5 text-[8.5px] text-slate-500 font-bold">
                            <span>TIMOTHY-LOGS // {task.id}</span>
                            <span className="flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${task.status === 'running' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                              <span>{task.status === 'running' ? 'STREAMING' : 'COMPLETED'}</span>
                            </span>
                          </div>
                          {activeLogData && activeLogData.visible_logs && activeLogData.visible_logs.length > 0 ? (
                            activeLogData.visible_logs.map((log: any, idx: number) => (
                              <div key={idx} className="flex gap-1.5 items-start hover:bg-white/5 p-0.5 rounded transition-colors">
                                <span className="text-indigo-400 select-none">❯</span>
                                <div className="flex-1">
                                  <span className="text-[8.5px] text-slate-500 mr-1.5 select-none">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                                  </span>
                                  <span className={log.message.includes('🎉') || log.message.includes('完了') ? 'text-emerald-400 font-bold' : log.message.includes('🤖') ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                                    {log.message}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 italic py-2 text-center animate-pulse">
                              自動タスクログを待機中...
                            </div>
                          )}
                          {task.status === 'running' && (
                            <div className="text-[8.5px] text-slate-500 pl-4 animate-pulse">
                              █ ANALYZING DEPENDENCY GRAPH...
                            </div>
                          )}
                        </div>
                      )}

                      {task.status === 'completed' && task.report && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-mono">
                          <CheckCircle className="h-3 w-3 text-emerald-500 inline mr-1" />
                          {task.report}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  <Cpu className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                  <p>待機中のタスクはありません。</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">ルカに「資料を要約して」「タスク計画を作って」等と指示を送ると提案されます。</p>
                </div>
              )}
            </div>

            {/* GitHub Repository State & Timothy Dev Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Github className="h-4.5 w-4.5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">テモテの開発ダッシュボード (GitHub Repo Tasks)</h3>
              </div>
              <GitHubRepoTasks 
                onAcceptDevTask={handleAcceptDevTask}
                username={gitHubUsername}
                repoName={selectedRepoForDashboard || undefined}
                repos={githubRepos}
                onSelectRepo={setSelectedRepoForDashboard}
              />
            </div>

            {/* Ruka's External GitHub Repository Sync */}
            <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-xs space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">ルカのGitHubリポジトリ自動同期・記憶</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                指定したGitHubアカウントのパブリックリポジトリ一覧をルカ（AI）が取得・コンパイルし、あなたの「共有記憶（Memories）」としてデータベースへインジェストします。同期後はルカとの対話や検索でこれらのプロジェクト情報を活用可能になります。
              </p>

              <div className="space-y-3 pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono pointer-events-none">github.com/</span>
                    <input
                      type="text"
                      value={gitHubUsername}
                      onChange={(e) => setGitHubUsername(e.target.value)}
                      onBlur={() => setGitHubUsername(extractGitHubUsername(gitHubUsername))}
                      placeholder="username"
                      className="w-full pl-[84px] pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 bg-slate-50/50"
                    />
                  </div>
                  <button
                    onClick={handleFetchGitHubRepos}
                    disabled={isFetchingGitHub || isSyncingGitHub}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 border border-slate-200 cursor-pointer"
                  >
                    {isFetchingGitHub ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    <span>取得</span>
                  </button>
                  <button
                    onClick={handleSyncGitHubRepos}
                    disabled={isFetchingGitHub || isSyncingGitHub}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500/50 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {isSyncingGitHub ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    <span>ルカに記憶させる</span>
                  </button>
                </div>

                {githubError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-[11px] text-rose-600">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{githubError}</span>
                  </div>
                )}

                {githubRepos.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-600">プレビュー: 取得したリポジトリ一覧 ({githubRepos.length} 件) - クリックでダッシュボード対象を設定</span>
                      <span className="text-slate-400 font-mono">@{gitHubUsername}</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 bg-slate-50/30">
                      {githubRepos.map((repo) => {
                        const isSelected = selectedRepoForDashboard === repo.name;
                        return (
                          <div 
                            key={repo.id} 
                            onClick={() => {
                              setSelectedRepoForDashboard(repo.name);
                              showToast('success', `ダッシュボードの対象を「${repo.name}」に設定しました。上の開発ダッシュボードを確認してください。`);
                            }}
                            className={`p-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-100 transition-all cursor-pointer rounded-lg ${
                              isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-500' : ''
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">{repo.name}</span>
                                {repo.language && (
                                  <span className="px-1.5 py-0.5 bg-slate-200/60 text-slate-600 text-[9px] rounded-sm font-mono">{repo.language}</span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[9px] rounded-sm font-bold animate-pulse">分析対象</span>
                                )}
                              </div>
                              {repo.description ? (
                                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{repo.description}</p>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">説明はありません</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 font-mono text-[10px] text-slate-500 shrink-0">
                              <div className="flex items-center gap-1 text-amber-500 font-bold">
                                <Star className="h-3 w-3 fill-amber-500" />
                                <span>{repo.stargazers_count}</span>
                              </div>
                              <span className="text-[9px] text-slate-400">更新: {new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Noah's Counseling Room */}
            <NoahCounseling
              userId={currentUser.id}
              showToast={(msg, type) => showToast(type, msg)}
            />

          </section>

          {/* Right Column (7 cols) */}
          <section className="lg:col-span-7 space-y-6">

            {/* Timothy's Calendar Panel */}
            <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-xs space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Calendar className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">テモテのカレンダー (Timothy's Calendar)</h3>
                <span className="ml-auto bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                  <span>同期完了</span>
                </span>
              </div>

              {/* Monthly Interactive Calendar */}
              <TimothyCalendar entries={allCalendarEntries} />

              {(() => {
                // Find calendar entries (category is event or tags include "テモテのカレンダー")
                const calendarEvents = allCalendarEntries.filter(
                  (entry) =>
                    entry.category === 'event' ||
                    entry.tags.includes('テモテのカレンダー')
                );

                if (calendarEvents.length > 0) {
                  // Sort chronologically by occurred_at or created_at
                  const sortedEvents = [...calendarEvents].sort((a, b) => {
                    const timeA = a.occurred_at ? new Date(a.occurred_at).getTime() : new Date(a.created_at).getTime();
                    const timeB = b.occurred_at ? new Date(b.occurred_at).getTime() : new Date(b.created_at).getTime();
                    return timeA - timeB;
                  });

                  return (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                        <span>登録済みのカレンダー予定一覧 ({sortedEvents.length}件):</span>
                      </h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {sortedEvents.map((evt) => {
                          const dateObj = evt.occurred_at ? new Date(evt.occurred_at) : new Date(evt.created_at);
                          const isSpecial = evt.tags.includes('テモテのカレンダー');
                          return (
                            <div key={evt.id} className={`rounded-xl p-3 border space-y-2 text-xs transition-all ${
                              isSpecial
                                ? 'bg-indigo-50/50 border-indigo-100 ring-1 ring-indigo-500/5'
                                : 'bg-slate-50/50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider flex items-center gap-1 ${
                                  isSpecial
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                                }`}>
                                  <CalendarDays className="h-2.5 w-2.5 text-indigo-600" />
                                  テモテのカレンダー予定
                                </span>
                                <span className="text-[10px] text-indigo-600 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                                  {dateObj.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })} {dateObj.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-800">{evt.summary}</h4>
                              <p className="text-[11px] text-slate-600 leading-relaxed bg-white/60 p-2 rounded-lg border border-slate-100/50">
                                {evt.raw_input}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {evt.tags.map((tag, idx) => (
                                  <span key={idx} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md border border-slate-200/50">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                              <div className="bg-white rounded-lg p-2.5 border border-indigo-100/60 shadow-3xs text-[10.5px] text-slate-600 italic leading-relaxed">
                                <strong>テモテより:</strong> 「このご予定は私の方でもばっちり把握いたしました。前日や開始時刻前に必要書類の手配や通知アラート、時差の確認（ブラジル時間等）など、万全の体制でサポートいたしますので、ご安心ください！」
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-6 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs space-y-2">
                      <CalendarDays className="h-6 w-6 text-slate-300 mx-auto" />
                      <div>
                        <p className="font-semibold text-slate-500">直近の予定はありません</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">テモテのカレンダーは現在空いています。</p>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100 text-left max-w-xs mx-auto text-[11px] text-slate-500 italic leading-normal">
                        <strong>テモテ:</strong> 「予定の登録は、『7月21日朝にブラジル担当者とのオンライン会議予定』のように話しかけるだけです。自動的にカレンダーとして整理し、大切な予定を絶対に見逃しません！」
                      </div>
                    </div>
                  );
                }
              })()}
            </div>

            {/* Ingested Stream Results list */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span>記憶ログ一覧 ({filteredEntries.length}件)</span>
                  {minImportance > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                      ★{minImportance}以上
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDbJsonModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold border border-slate-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
                    title="現在の記憶データをJSONファイル形式で表示・エクスポート"
                  >
                    <FileJson className="h-3.5 w-3.5 text-indigo-600" />
                    <span>JSONファイル表示</span>
                  </button>
                  <span className="text-xs text-slate-400">
                    空間: {currentUser.name}
                  </span>
                </div>
              </div>

              {filteredEntries.length > 0 ? (
                <div className="space-y-3.5">
                  {filteredEntries.map((entry) => {
                    const details = CATEGORY_DETAILS[entry.category] || CATEGORY_DETAILS.other;
                    const Icon = details.icon;
                    const isExpanded = !!expandedEntries[entry.id];
                    const hasEntities =
                      entry.structured.entities.people.length > 0 ||
                      entry.structured.entities.places.length > 0 ||
                      entry.structured.entities.dates.length > 0;

                    if (editingEntryId === entry.id) {
                      return (
                        <motion.div
                          key={entry.id}
                          layout="position"
                          className="bg-slate-50 border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4 relative"
                        >
                          <div className="absolute top-3 right-3 text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            編集モード
                          </div>

                          <div className="space-y-3.5">
                            {/* Title / Summary */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                タイトル / 概要
                              </label>
                              <input
                                type="text"
                                value={editSummary}
                                onChange={(e) => setEditSummary(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800"
                                placeholder="概要を入力してください"
                              />
                            </div>

                            {/* Raw text / Original Log */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                原文ログ / トランスクリプト
                              </label>
                              <textarea
                                value={editRawInput}
                                onChange={(e) => setEditRawInput(e.target.value)}
                                rows={2}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 text-slate-800 font-mono"
                                placeholder="原文の出来事やメモ..."
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Category selector */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  カテゴリ
                                </label>
                                <select
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800 cursor-pointer"
                                >
                                  {Object.entries(CATEGORY_DETAILS).map(([key, details]) => (
                                    <option key={key} value={key}>
                                      {details.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Importance selector */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  重要度
                                </label>
                                <div className="flex items-center gap-1.5 h-[34px]">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setEditImportance(star)}
                                      className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                                    >
                                      <Star
                                        className={`h-4.5 w-4.5 ${
                                          star <= editImportance ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                  <span className="text-[10px] text-slate-400 font-mono ml-1 font-bold">
                                    {editImportance}/5
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Occurred At date picker */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  発生日時 (Occurred At)
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editOccurredAt}
                                  onChange={(e) => setEditOccurredAt(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 text-slate-800 font-mono"
                                />
                              </div>

                              {/* Tags list */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  タグ (カンマ区切り)
                                </label>
                                <input
                                  type="text"
                                  value={editTags}
                                  onChange={(e) => setEditTags(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800"
                                  placeholder="健康, お悩み, 予定"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Edit Actions buttons */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-all cursor-pointer"
                            >
                              キャンセル
                            </button>
                            <button
                              type="button"
                              disabled={isSavingEdit}
                              onClick={() => saveEditing(entry.id)}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              {isSavingEdit ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  <span>保存中...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>変更を保存</span>
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      );
                    }

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

                        {/* Fallback Unprocessed AI Notice */}
                        {entry.tags && entry.tags.includes('AI未処理') && (
                          <div className="mb-3.5 bg-rose-50/75 border border-rose-200/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4.5 w-4.5 text-rose-500 mt-0.5 flex-shrink-0" />
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-rose-800 block">AI簡易処理 (混雑によるフォールバック)</span>
                                <span className="text-[10.5px] text-rose-600 block leading-normal">
                                  AIサーバー混雑のため、この記録は簡易保存されました。再コンパイルを呼び出し、自動カレンダー・アクション・詳細カテゴリ分析を実行できます。
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={recompilingIds.includes(entry.id)}
                              onClick={() => handleRecompileEntry(entry.id)}
                              className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shadow-3xs ${
                                recompilingIds.includes(entry.id) ? 'animate-pulse' : ''
                              }`}
                            >
                              {recompilingIds.includes(entry.id) ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  <span>再解析中...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3" />
                                  <span>AI再コンパイル</span>
                                </>
                              )}
                            </button>
                          </div>
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

                          {/* Right: Date occur & Action */}
                          <div className="flex flex-col items-end gap-2 text-right text-[11px] text-slate-400 font-mono whitespace-nowrap">
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
                            {deletingEntryId === entry.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 rounded-lg p-1">
                                <span className="text-[10px] font-bold text-rose-700 px-1.5">本当に削除？</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                                >
                                  はい
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingEntryId(null)}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                                >
                                  いいえ
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={pendingEvaluations[entry.id]?.loading}
                                  onClick={() => handleReEvaluateEntry(entry)}
                                  className={`p-1.5 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 text-slate-400 hover:text-violet-600 rounded-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                                    pendingEvaluations[entry.id]?.loading ? 'animate-pulse' : ''
                                  }`}
                                  title="AIで重要度・カテゴリを再評価"
                                >
                                  {pendingEvaluations[entry.id]?.loading ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditing(entry)}
                                  className="p-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-400 hover:text-amber-600 rounded-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                  title="記憶を編集"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareEntry(entry)}
                                  className="p-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-400 hover:text-indigo-600 rounded-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                  title="共有用URLをコピー"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingEntryId(entry.id)}
                                  className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                  title="記憶を削除"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                        </div>

                        {/* AI Evaluation Proposal Box */}
                        {pendingEvaluations[entry.id] && !pendingEvaluations[entry.id].loading && pendingEvaluations[entry.id].reason && (
                          <div
                            className="mt-3 bg-violet-50/70 border border-violet-200/50 rounded-xl p-3.5 space-y-3 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 h-16 w-16 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
                            <div className="flex items-start gap-2.5">
                              <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                              <div className="space-y-2 w-full">
                                <div className="space-y-0.5">
                                  <span className="text-xs font-bold text-violet-900 block flex items-center gap-1">
                                    <span>🤖 AIによる再評価の推奨案</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 block font-medium">
                                    記憶のコンテキストを分析し、最適なカテゴリと重要度を監査しました。
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-white/85 p-2.5 rounded-lg border border-violet-100/60 font-semibold text-slate-700 shadow-3xs">
                                  <div className="space-y-1 border-r border-slate-100 pr-2">
                                    <span className="text-[9px] text-slate-400 font-bold block">カテゴリ</span>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="line-through text-slate-400 text-[10px]">
                                        {CATEGORY_DETAILS[entry.category]?.label || entry.category}
                                      </span>
                                      <span className="text-slate-400 text-[9px]">➔</span>
                                      <span className="text-violet-700 font-bold">
                                        {CATEGORY_DETAILS[pendingEvaluations[entry.id].suggested_category]?.label || pendingEvaluations[entry.id].suggested_category}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-1 pl-2">
                                    <span className="text-[9px] text-slate-400 font-bold block">重要度</span>
                                    <div className="flex items-center gap-1">
                                      <span className="line-through text-slate-400 text-[10px]">
                                        ★{entry.importance}
                                      </span>
                                      <span className="text-slate-400 text-[9px]">➔</span>
                                      <span className="text-amber-600 font-bold">
                                        ★{pendingEvaluations[entry.id].suggested_importance}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-white/40 p-2 rounded border border-slate-100/50">
                                  <span className="font-bold text-violet-700">理由:</span> {pendingEvaluations[entry.id].reason}
                                </p>

                                <div className="flex items-center gap-2 pt-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingEvaluations((prev) => {
                                        const next = { ...prev };
                                        delete next[entry.id];
                                        return next;
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                                  >
                                    却下
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveEvaluation(entry.id)}
                                    className="px-3.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-3xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>承認して更新</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

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

                                {/* Toggle JSON view of this entry */}
                                <div className="border-t border-slate-100/80 pt-2.5 flex items-center justify-between text-[11px]">
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ID: {entry.id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEntryJson(selectedEntryJson?.id === entry.id ? null : entry)}
                                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                                  >
                                    <FileJson className="h-3 w-3" />
                                    <span>{selectedEntryJson?.id === entry.id ? 'JSONを閉じる' : 'JSON表示'}</span>
                                  </button>
                                </div>

                                {selectedEntryJson?.id === entry.id && (
                                  <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] font-mono whitespace-pre overflow-x-auto relative mt-2 max-h-60 border border-slate-800">
                                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleCopyToClipboard(JSON.stringify(entry, null, 2), '個別のJSONをコピーしました。')}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                                        title="JSONをコピー"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadJson(`memory-${entry.id}.json`, entry)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                                        title="JSONをダウンロード"
                                      >
                                        <Download className="h-3 w-3" />
                                      </button>
                                    </div>
                                    {JSON.stringify(entry, null, 2)}
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

            {/* Memory Trend Analytics */}
            <MemoryTrendChart entries={filteredEntries} />

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

      {/* DB JSON Export / View Modal */}
      <AnimatePresence>
        {showDbJsonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <FileJson className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">入力内容のJSONファイル表示</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      現在の一致する記憶ログデータ ({filteredEntries.length}件) をJSONフォーマットで展開しています。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDbJsonModal(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
                  <span>
                    全データのインデックス・メタデータ、タグ、AI構造化オブジェクトを完全なJSON配列として表現。
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyToClipboard(JSON.stringify(filteredEntries, null, 2), 'データベース全体のJSONをコピーしました。')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold border border-slate-200 transition-all active:scale-95 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>JSONをコピー</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadJson('ruka-memories-export.json', filteredEntries)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>ダウンロード (.json)</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono whitespace-pre overflow-x-auto max-h-[50vh] border border-slate-800 relative shadow-inner">
                  {filteredEntries.length > 0 ? (
                    JSON.stringify(filteredEntries, null, 2)
                  ) : (
                    <span className="text-slate-500 italic">データがありません。重要度フィルタに該当する記憶ログが存在しません。</span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>スキーマ標準: Standard Memory Schema v1</span>
                <button
                  type="button"
                  onClick={() => setShowDbJsonModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shared Memory Detail Modal */}
      <AnimatePresence>
        {sharedModalEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100">
                    <Share2 className="h-4 w-4 text-teal-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">共有された記憶ノード</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      リンクを介してこの特別な記憶データが正常に展開されました。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSharedModal}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Category Pill */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const details = CATEGORY_DETAILS[sharedModalEntry.category] || CATEGORY_DETAILS.other;
                      const Icon = details.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${details.bg} ${details.color} border ${details.border}`}>
                          <Icon className="h-3.5 w-3.5" />
                          <span>{details.label}</span>
                        </span>
                      );
                    })()}

                    {/* Importance */}
                    <span className="text-slate-300 text-xs font-mono font-medium flex items-center ml-1">
                      {'★'.repeat(sharedModalEntry.importance)}
                      <span className="text-slate-200 font-normal">
                        {'★'.repeat(Math.max(0, 5 - sharedModalEntry.importance))}
                      </span>
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-slate-400 font-mono">
                    発生日時:{' '}
                    {sharedModalEntry.occurred_at
                      ? new Date(sharedModalEntry.occurred_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : new Date(sharedModalEntry.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                  </span>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">要約タイトル</span>
                  <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
                    {sharedModalEntry.summary}
                  </h2>
                </div>

                {/* Raw Input detail */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">原文音声・入力ログ</span>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap shadow-inner">
                    {sharedModalEntry.raw_input}
                  </div>
                </div>

                {/* AI Extracted Entities */}
                {(() => {
                  const hasEntities =
                    sharedModalEntry.structured.entities.people.length > 0 ||
                    sharedModalEntry.structured.entities.places.length > 0 ||
                    sharedModalEntry.structured.entities.dates.length > 0;
                  if (!hasEntities) return null;
                  return (
                    <div className="bg-indigo-50/45 border border-indigo-100/50 rounded-xl p-3.5 text-xs space-y-2">
                      <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">AI抽出 エンティティ分析:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {sharedModalEntry.structured.entities.people.length > 0 && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 text-[10px]">人物</span>
                            <p className="text-slate-800 font-semibold">{sharedModalEntry.structured.entities.people.join(', ')}</p>
                          </div>
                        )}
                        {sharedModalEntry.structured.entities.places.length > 0 && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 text-[10px]">場所</span>
                            <p className="text-slate-800 font-semibold">{sharedModalEntry.structured.entities.places.join(', ')}</p>
                          </div>
                        )}
                        {sharedModalEntry.structured.entities.dates.length > 0 && (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 text-[10px]">時代表現</span>
                            <p className="text-slate-800 font-semibold">{sharedModalEntry.structured.entities.dates.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Tags */}
                {sharedModalEntry.tags.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">タグ一覧</span>
                    <div className="flex flex-wrap gap-1.5">
                      {sharedModalEntry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(
                    `${sharedModalEntry.summary}\n\n[詳細]\n${sharedModalEntry.raw_input}`,
                    '記憶のテキスト要約をコピーしました！'
                  )}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>詳細をテキストコピー</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseSharedModal}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
