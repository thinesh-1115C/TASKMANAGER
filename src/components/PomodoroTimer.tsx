import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskStatus } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle,
  Timer,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Target,
  Sparkles,
  Flame,
} from 'lucide-react';

interface PomodoroTimerProps {
  tasks: Task[];
  focusedTaskId: string | null;
  onSelectFocusedTask: (taskId: string | null) => void;
  onToggleStatus: (taskId: string, newStatus: TaskStatus) => void;
}

type TimerMode = 'work' | 'short_break' | 'long_break';

const MODE_CONFIG: Record<
  TimerMode,
  { label: string; duration: number; badgeColor: string; strokeColor: string }
> = {
  work: {
    label: 'Focus Work',
    duration: 25 * 60, // 25 minutes
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    strokeColor: '#f43f5e',
  },
  short_break: {
    label: 'Short Break',
    duration: 5 * 60, // 5 minutes
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    strokeColor: '#10b981',
  },
  long_break: {
    label: 'Long Break',
    duration: 15 * 60, // 15 minutes
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    strokeColor: '#3b82f6',
  },
};

export default function PomodoroTimer({
  tasks,
  focusedTaskId,
  onSelectFocusedTask,
  onToggleStatus,
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_CONFIG.work.duration);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showTaskSelector, setShowTaskSelector] = useState<boolean>(false);

  const activeTasks = tasks.filter((t) => t.status !== 'completed');

  // Currently linked active task
  const activeTask =
    activeTasks.find((t) => t.id === focusedTaskId) ||
    (focusedTaskId ? null : activeTasks[0] || null);

  // Synchronize initial selection if not set
  useEffect(() => {
    if (!focusedTaskId && activeTasks.length > 0) {
      onSelectFocusedTask(activeTasks[0].id);
    }
  }, [activeTasks, focusedTaskId, onSelectFocusedTask]);

  // Handle mode switches
  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(MODE_CONFIG[newMode].duration);
    setIsRunning(false);
  };

  // Play audio chime using Web Audio API on session complete
  const playChime = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Friendly chime chord (C5 + G5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.3); // E5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, now); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.4); // C6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } catch {
      // AudioContext unavailable or restricted
    }
  };

  // Timer countdown loop
  useEffect(() => {
    let interval: any = null;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            playChime();

            if (mode === 'work') {
              setSessionsCompleted((s) => s + 1);
              // Auto transition to short break after 25 mins
              switchMode('short_break');
            } else {
              // Return to work after break
              switchMode('work');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, isMuted]);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle play/pause
  const handleTogglePlay = () => {
    // If starting a work interval and task is in 'todo', mark it 'in_progress'
    if (!isRunning && mode === 'work' && activeTask && activeTask.status === 'todo') {
      onToggleStatus(activeTask.id, 'in_progress');
    }
    setIsRunning(!isRunning);
  };

  // Reset current interval
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(MODE_CONFIG[mode].duration);
  };

  // Complete currently linked active task
  const handleCompleteActiveTask = () => {
    if (activeTask) {
      onToggleStatus(activeTask.id, 'completed');
      // Next available task will be linked automatically
    }
  };

  const currentDuration = MODE_CONFIG[mode].duration;
  const progressPercent = ((currentDuration - timeLeft) / currentDuration) * 100;

  return (
    <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-b from-rose-50/80 via-white to-rose-50/30 p-3.5 shadow-xs space-y-3 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-2xs">
            <Timer className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 leading-none block">
              Focus Timer
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Pomodoro 25m</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Mute audio toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-rose-100/60 transition-colors"
            title={isMuted ? 'Unmute chime' : 'Mute chime'}
          >
            {isMuted ? <VolumeX className="w-3 h-3 text-rose-500" /> : <Volume2 className="w-3 h-3" />}
          </button>

          {/* Collapse/Expand */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-rose-100/60 transition-colors"
            title={isCollapsed ? 'Expand timer' : 'Collapse timer'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mini Collapsed Bar */}
      {isCollapsed ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono text-sm font-bold text-rose-700">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[11px] text-slate-600 truncate max-w-[110px]">
              {activeTask ? activeTask.title : 'No active task'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleTogglePlay}
            className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer"
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
          </button>
        </div>
      ) : (
        <>
          {/* Interval Mode Switcher (Work 25m / Short 5m / Long 15m) */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 rounded-xl text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => switchMode('work')}
              className={`py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'work'
                  ? 'bg-white text-rose-700 font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Work 25m
            </button>
            <button
              type="button"
              onClick={() => switchMode('short_break')}
              className={`py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'short_break'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Break 5m
            </button>
            <button
              type="button"
              onClick={() => switchMode('long_break')}
              className={`py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'long_break'
                  ? 'bg-white text-blue-700 font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Rest 15m
            </button>
          </div>

          {/* Linked Active Task Pill */}
          <div className="relative bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-2.5 h-2.5 text-rose-500" />
                Linked Active Task
              </span>

              {activeTasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowTaskSelector(!showTaskSelector)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showTaskSelector ? 'Close' : 'Change'}
                </button>
              )}
            </div>

            {/* Task Title & Quick Action */}
            {activeTask ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className="text-xs font-bold text-slate-800 truncate"
                    title={activeTask.title}
                  >
                    {activeTask.title}
                  </span>
                  <button
                    type="button"
                    onClick={handleCompleteActiveTask}
                    className="shrink-0 p-1 text-slate-400 hover:text-emerald-600 rounded-md transition-colors"
                    title="Mark active task completed"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                    {activeTask.category || 'General'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md font-semibold capitalize ${
                      activeTask.priority === 'urgent'
                        ? 'bg-rose-50 text-rose-700'
                        : activeTask.priority === 'high'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {activeTask.priority}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">No active tasks available</p>
            )}

            {/* Task Selector Dropdown (when changing task) */}
            {showTaskSelector && activeTasks.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1 max-h-32 overflow-y-auto">
                {activeTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectFocusedTask(t.id);
                      setShowTaskSelector(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg text-xs truncate transition-colors flex items-center justify-between ${
                      activeTask?.id === t.id
                        ? 'bg-rose-50 text-rose-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="text-[9px] uppercase px-1 rounded-xs bg-slate-100 text-slate-500 shrink-0 ml-1">
                      {t.priority}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Large Digital Display & Circular/Linear Progress */}
          <div className="text-center py-1">
            <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatTime(timeLeft)}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-rose-100/70 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: MODE_CONFIG[mode].strokeColor,
                }}
              />
            </div>

            {/* Session Stats */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-2 px-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>{sessionsCompleted} completed</span>
              </span>
              <span className="text-slate-400">
                {mode === 'work' ? '25m sprint' : 'Rest time'}
              </span>
            </div>
          </div>

          {/* Timer Action Buttons */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title="Reset current interval"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer text-white ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Interval</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start 25m Interval</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (mode === 'work') switchMode('short_break');
                else switchMode('work');
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title="Skip to next phase"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
