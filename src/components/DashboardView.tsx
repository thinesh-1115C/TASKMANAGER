import React, { useState, useMemo } from 'react';
import { Task, TaskList } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  Filter,
  CheckSquare,
  Clock,
  CircleAlert,
} from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  lists: TaskList[];
  onSelectCategory?: (category: string | null) => void;
  onNavigateToTasks?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Work: '#3b82f6', // blue
  Personal: '#10b981', // emerald
  Projects: '#8b5cf6', // purple
  Learning: '#f59e0b', // amber
  Fitness: '#ec4899', // pink
  Finance: '#06b6d4', // cyan
  Default: '#64748b', // slate
};

const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
];

export default function DashboardView({
  tasks,
  lists,
  onSelectCategory,
  onNavigateToTasks,
}: DashboardViewProps) {
  const [timeRange, setTimeRange] = useState<30 | 14 | 7>(30);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [trendMetric, setTrendMetric] = useState<'daily' | 'cumulative' | 'comparison'>('daily');
  const [useSampleData, setUseSampleData] = useState<boolean>(false);

  // Generate synthetic dates for the selected time window (default 30 days)
  const windowDays = timeRange;

  // Filter tasks if category filter is active
  const scopedTasks = useMemo(() => {
    if (selectedCategoryFilter === 'all') return tasks;
    return tasks.filter((t) => (t.category || 'Uncategorized') === selectedCategoryFilter);
  }, [tasks, selectedCategoryFilter]);

  // If useSampleData is toggled, create a rich historical sample set for demonstration
  const effectiveTasks = useMemo(() => {
    if (!useSampleData) return scopedTasks;

    // Generate realistic historical demo tasks over past 30 days
    const demoCategories = ['Work', 'Personal', 'Projects', 'Learning', 'Finance'];
    const generated: Task[] = [...scopedTasks];
    const now = new Date();

    for (let i = 0; i < 45; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const taskDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const isCompleted = Math.random() > 0.3;
      const cat = demoCategories[Math.floor(Math.random() * demoCategories.length)];

      generated.push({
        id: `demo-task-${i}`,
        userId: 'demo-user',
        title: `Sample Task ${i + 1}`,
        status: isCompleted ? 'completed' : Math.random() > 0.5 ? 'in_progress' : 'todo',
        priority: Math.random() > 0.7 ? 'urgent' : Math.random() > 0.4 ? 'high' : 'medium',
        category: cat,
        createdAt: taskDate.toISOString(),
        updatedAt: isCompleted ? taskDate.toISOString() : now.toISOString(),
        tags: ['sample'],
      });
    }
    return generated;
  }, [scopedTasks, useSampleData]);

  // 30-Day Completion Trend Data calculation
  const trendData = useMemo(() => {
    const today = new Date();
    const daysArray: {
      dateStr: string;
      displayDate: string;
      fullDate: string;
      completed: number;
      created: number;
      cumulativeCompleted: number;
    }[] = [];

    // Pre-populate days
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const fullDate = d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      daysArray.push({
        dateStr,
        displayDate,
        fullDate,
        completed: 0,
        created: 0,
        cumulativeCompleted: 0,
      });
    }

    const dayMap = new Map(daysArray.map((item) => [item.dateStr, item]));

    // Map tasks to completed dates and creation dates
    effectiveTasks.forEach((task) => {
      // Completed date mapping
      if (task.status === 'completed') {
        const completedDateStr = (task.updatedAt || task.createdAt || '').split('T')[0];
        const dayEntry = dayMap.get(completedDateStr);
        if (dayEntry) {
          dayEntry.completed += 1;
        }
      }

      // Created date mapping
      if (task.createdAt) {
        const createdDateStr = task.createdAt.split('T')[0];
        const dayEntry = dayMap.get(createdDateStr);
        if (dayEntry) {
          dayEntry.created += 1;
        }
      }
    });

    // Calculate cumulative completed count
    let runningTotal = 0;
    daysArray.forEach((d) => {
      runningTotal += d.completed;
      d.cumulativeCompleted = runningTotal;
    });

    return daysArray;
  }, [effectiveTasks, windowDays]);

  // Category Breakdown Data calculation
  const categoryBreakdown = useMemo(() => {
    const counts: Record<
      string,
      {
        category: string;
        total: number;
        completed: number;
        inProgress: number;
        todo: number;
        color: string;
      }
    > = {};

    effectiveTasks.forEach((t) => {
      const cat = t.category?.trim() || 'Uncategorized';
      if (!counts[cat]) {
        // Look up custom list color or default
        const listMatch = lists.find((l) => l.name.toLowerCase() === cat.toLowerCase());
        const catColor =
          listMatch?.color ||
          CATEGORY_COLORS[cat] ||
          COLOR_PALETTE[Object.keys(counts).length % COLOR_PALETTE.length];

        counts[cat] = {
          category: cat,
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
          color: catColor,
        };
      }

      counts[cat].total += 1;
      if (t.status === 'completed') {
        counts[cat].completed += 1;
      } else if (t.status === 'in_progress') {
        counts[cat].inProgress += 1;
      } else {
        counts[cat].todo += 1;
      }
    });

    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [effectiveTasks, lists]);

  // Pie chart data: proportion of completed tasks by category (or all tasks)
  const categoryPieData = useMemo(() => {
    return categoryBreakdown
      .filter((c) => c.total > 0)
      .map((c) => ({
        name: c.category,
        value: c.completed > 0 ? c.completed : c.total,
        totalTasks: c.total,
        completedTasks: c.completed,
        color: c.color,
      }));
  }, [categoryBreakdown]);

  // Summary Metrics calculation
  const totalTasksCount = effectiveTasks.length;
  const totalCompletedInWindow = trendData.reduce((acc, curr) => acc + curr.completed, 0);
  const totalCompletedAll = effectiveTasks.filter((t) => t.status === 'completed').length;
  const overallCompletionRate =
    totalTasksCount > 0 ? Math.round((totalCompletedAll / totalTasksCount) * 100) : 0;
  const averageVelocity = (totalCompletedInWindow / windowDays).toFixed(1);

  // Peak day computation
  const peakDay = useMemo(() => {
    let max = 0;
    let dayLabel = 'None';
    trendData.forEach((d) => {
      if (d.completed > max) {
        max = d.completed;
        dayLabel = d.displayDate;
      }
    });
    return { count: max, dayLabel };
  }, [trendData]);

  // Top category computation
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  // Custom Tooltip for Area/Line Trend Chart
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 backdrop-blur-xs min-w-[170px]">
          <p className="font-semibold text-slate-300 border-b border-slate-800 pb-1">
            {dataPoint.fullDate}
          </p>
          {trendMetric === 'daily' && (
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>Completed Tasks:</span>
              <span className="text-sm">{dataPoint.completed}</span>
            </div>
          )}
          {trendMetric === 'cumulative' && (
            <div className="flex items-center justify-between text-blue-400 font-bold">
              <span>Cumulative Completed:</span>
              <span className="text-sm">{dataPoint.cumulativeCompleted}</span>
            </div>
          )}
          {trendMetric === 'comparison' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-emerald-400">
                <span>Completed:</span>
                <span className="font-bold">{dataPoint.completed}</span>
              </div>
              <div className="flex items-center justify-between text-indigo-400">
                <span>Created:</span>
                <span className="font-bold">{dataPoint.created}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Category Breakdown
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const completionRate =
        data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1 backdrop-blur-xs min-w-[160px]">
          <p className="font-bold text-slate-100 flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: data.color }}
            />
            {data.category || data.name}
          </p>
          <div className="pt-1 space-y-0.5 text-slate-300">
            <div className="flex justify-between">
              <span>Completed:</span>
              <span className="font-semibold text-emerald-400">{data.completed || data.completedTasks || 0}</span>
            </div>
            {data.total !== undefined && (
              <div className="flex justify-between">
                <span>Total Tasks:</span>
                <span className="font-semibold text-white">{data.total}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-800 text-blue-300 font-medium">
              <span>Completion Rate:</span>
              <span>{completionRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h2>
              <p className="text-xs text-slate-500">
                Visualizing completion velocity over the last {windowDays} days and category distribution
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sample Data Toggle */}
          <button
            type="button"
            onClick={() => setUseSampleData(!useSampleData)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              useSampleData
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle simulated historical data to preview rich graphs"
          >
            <Sparkles className={`w-3.5 h-3.5 ${useSampleData ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>{useSampleData ? 'Demo Data Active' : 'Preview Demo Data'}</span>
          </button>

          {/* Time Range Selector */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange(7)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === 7
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange(14)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === 14
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              14 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange(30)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeRange === 30
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categoryBreakdown.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Completed in Window */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Completed ({windowDays}d)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalCompletedInWindow}</span>
            <span className="text-xs text-slate-500">tasks</span>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            Velocity: <strong className="text-slate-700 font-semibold">{averageVelocity}</strong> / day
          </p>
        </div>

        {/* Metric 2: Overall Completion Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Completion Rate</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PercentIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{overallCompletionRate}%</span>
            <span className="text-xs text-slate-400">of all tasks</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallCompletionRate}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Peak Productivity Day */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Peak Day</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{peakDay.count}</span>
            <span className="text-xs text-slate-500">completed</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Recorded on <strong className="text-slate-700 font-semibold">{peakDay.dayLabel}</strong>
          </p>
        </div>

        {/* Metric 4: Top Category */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Leading Category</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 truncate">
            <span className="text-xl font-bold text-slate-900 truncate">
              {topCategory?.category || 'None'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {topCategory
              ? `${topCategory.completed} of ${topCategory.total} completed`
              : 'No categories recorded'}
          </p>
        </div>
      </div>

      {/* SECTION 1: 30-Day Completion Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Task Completion Trends (Last {windowDays} Days)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily volume of tasks finished across all lists and categories
            </p>
          </div>

          {/* Metric Selector for Trend */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTrendMetric('daily')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                trendMetric === 'daily'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Count
            </button>
            <button
              type="button"
              onClick={() => setTrendMetric('cumulative')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                trendMetric === 'cumulative'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cumulative
            </button>
            <button
              type="button"
              onClick={() => setTrendMetric('comparison')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                trendMetric === 'comparison'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed vs Created
            </button>
          </div>
        </div>

        {/* Empty notice if no completed tasks and not in demo mode */}
        {totalCompletedInWindow === 0 && !useSampleData && (
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleAlert className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                No tasks were completed in this {windowDays}-day range yet. Complete some tasks or toggle <strong>Preview Demo Data</strong> above to see trends!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setUseSampleData(true)}
              className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shrink-0 ml-3"
            >
              Turn on Demo Data
            </button>
          </div>
        )}

        {/* Area / Trend Chart Container */}
        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
                interval={windowDays === 30 ? 3 : windowDays === 14 ? 1 : 0}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip content={<CustomTrendTooltip />} />

              {trendMetric === 'daily' && (
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Tasks Completed"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#completedGradient)"
                  activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                />
              )}

              {trendMetric === 'cumulative' && (
                <Area
                  type="monotone"
                  dataKey="cumulativeCompleted"
                  name="Cumulative Completed"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cumulativeGradient)"
                  activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                />
              )}

              {trendMetric === 'comparison' && (
                <>
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#completedGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#createdGradient)"
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 2: Breakdown by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Bar Chart Status Comparison across Categories (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Category Task Volume & Completion
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Completed vs pending tasks across each category
              </p>
            </div>
          </div>

          <div className="w-full h-72 pt-2">
            {categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No categories available to visualize
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryBreakdown}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="category"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomCategoryTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="inProgress"
                    name="In Progress"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="todo"
                    name="To Do"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Category Distribution Donut & Metrics (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-purple-600" />
                Category Share
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {categoryPieData.length} Categories
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Proportion of completed tasks by category
            </p>

            {/* Donut Chart */}
            <div className="w-full h-52 my-1 relative">
              {categoryPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No task data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomCategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category List Mini Table */}
          <div className="space-y-2 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto pr-1">
            {categoryBreakdown.map((item) => {
              const compRate =
                item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
              return (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-800 truncate">{item.category}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-500">
                      <strong className="text-slate-700 font-bold">{item.completed}</strong> / {item.total}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {compRate}%
                    </span>
                    {onSelectCategory && onNavigateToTasks && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(item.category);
                          onNavigateToTasks();
                        }}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        title={`Filter tasks by ${item.category}`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PercentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}
