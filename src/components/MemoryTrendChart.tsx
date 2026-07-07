import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { TrendingUp, Calendar, Zap, Award } from 'lucide-react';
import { MemoryEntry } from '../types';

interface MemoryTrendChartProps {
  entries: MemoryEntry[];
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export const MemoryTrendChart: React.FC<MemoryTrendChartProps> = ({ entries }) => {
  // Generate date list for the past 7 days
  const chartData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const getLocalDateString = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const getEntryLocalDateString = (entry: MemoryEntry) => {
      const dateStr = entry.occurred_at || entry.created_at;
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return getLocalDateString(d);
    };

    // Calculate count per day
    return dates.map((date) => {
      const dateStr = getLocalDateString(date);
      const dayLabel = `${date.getMonth() + 1}/${date.getDate()}(${DAYS_OF_WEEK[date.getDay()]})`;
      
      const dayEntries = entries.filter((entry) => {
        return getEntryLocalDateString(entry) === dateStr;
      });

      // Break down by category categories (tasks, events, others)
      const tasksCount = dayEntries.filter(e => e.category === 'task').length;
      const faithCount = dayEntries.filter(e => e.category === 'faith').length;
      const othersCount = dayEntries.length - tasksCount - faithCount;

      return {
        dateStr,
        name: dayLabel,
        count: dayEntries.length,
        tasks: tasksCount,
        faith: faithCount,
        others: othersCount,
      };
    });
  }, [entries]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = chartData.reduce((acc, curr) => acc + curr.count, 0);
    const avg = Math.round((total / 7) * 10) / 10;
    const peak = Math.max(...chartData.map((d) => d.count), 0);
    const peakDay = chartData.find((d) => d.count === peak)?.name || '-';

    return { total, avg, peak, peakDay };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-800 shadow-xl text-xs space-y-2 backdrop-blur-xs">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-indigo-400" />
            <span>{label}</span>
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">合計記憶数:</span>
              <span className="font-extrabold text-indigo-300">{data.count} 件</span>
            </div>
            {data.count > 0 && (
              <div className="pl-2 border-l border-slate-700 space-y-0.5 text-[10px]">
                {data.tasks > 0 && (
                  <div className="flex justify-between text-sky-300">
                    <span>タスク:</span>
                    <span>{data.tasks} 件</span>
                  </div>
                )}
                {data.faith > 0 && (
                  <div className="flex justify-between text-violet-300">
                    <span>価値観・信仰:</span>
                    <span>{data.faith} 件</span>
                  </div>
                )}
                {data.others > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>その他:</span>
                    <span>{data.others} 件</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header and Stats Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <TrendingUp className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">過去7日間の記憶件数推移</h3>
            <p className="text-[10px] text-slate-400">現在の一致データに基づくアクティビティ推移</p>
          </div>
        </div>

        {/* Quick stats grid */}
        <div className="flex items-center gap-4 text-xs">
          <div className="px-2.5 py-1 bg-indigo-50/60 rounded-lg border border-indigo-100/50">
            <div className="text-[9px] text-indigo-600 font-semibold uppercase tracking-wider">7日間合計</div>
            <div className="font-extrabold text-indigo-950 flex items-baseline gap-0.5">
              <span className="text-sm">{stats.total}</span>
              <span className="text-[10px] font-medium text-indigo-700">件</span>
            </div>
          </div>
          <div className="px-2.5 py-1 bg-emerald-50/60 rounded-lg border border-emerald-100/50">
            <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider">1日平均</div>
            <div className="font-extrabold text-emerald-950 flex items-baseline gap-0.5">
              <span className="text-sm">{stats.avg}</span>
              <span className="text-[10px] font-medium text-emerald-700">件</span>
            </div>
          </div>
          <div className="px-2.5 py-1 bg-amber-50/60 rounded-lg border border-amber-100/50">
            <div className="text-[9px] text-amber-600 font-semibold uppercase tracking-wider">ピーク日</div>
            <div className="font-extrabold text-amber-950 flex items-baseline gap-1">
              <span className="text-sm">{stats.peak}</span>
              <span className="text-[9px] text-slate-500 font-normal">({stats.peakDay})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Area Chart Container */}
      <div className="h-44 w-full text-xs" id="memory-trend-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorMemoryCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorMemoryCount)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Dynamic Activity Insights footer */}
      {stats.total > 0 ? (
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 flex items-start gap-2 text-[10.5px] text-slate-600">
          <Zap className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            過去7日間で最も記憶が活発だったのは <span className="font-bold text-slate-900">{stats.peakDay}</span> の <span className="font-bold text-slate-900">{stats.peak}件</span> でした。
            引き続き毎日の思考やタスクを音声・テキストでRukaに話しかけてログを共有しましょう。
          </p>
        </div>
      ) : (
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-2.5 flex items-start gap-2 text-[10.5px] text-slate-500 italic justify-center text-center">
          <Award className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span>過去7日間に一致する記憶ログがありません。まずは上の会話欄から新しい記憶を入力してみましょう！</span>
        </div>
      )}
    </div>
  );
};
