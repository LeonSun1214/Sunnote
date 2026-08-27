import { useEffect, useRef, useState } from 'react';
import { cx } from '../utils/ui';

interface Props {
  seconds: number;
  label?: string;
  /** 倒计时结束时回调，用于自动把用时填进表单。 */
  onFinish?: (elapsedSec: number) => void;
}

/**
 * 答题计时器。写作 6/7/10 分钟、口语 45 秒都用它。
 * 计时基于时间戳而不是累加 setInterval，切到后台再回来也不会走慢。
 */
export function Countdown({ seconds, label, onFinish }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number>(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        finishRef.current?.(seconds);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, seconds]);

  const start = () => {
    endAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  };
  const pause = () => {
    setRunning(false);
    finishRef.current?.(seconds - remaining);
  };
  const reset = () => {
    setRunning(false);
    setRemaining(seconds);
  };

  const mm = Math.floor(remaining / 60);
  const ss = `${remaining % 60}`.padStart(2, '0');
  const nearlyUp = remaining <= Math.min(10, seconds * 0.15);

  return (
    <div className="flex items-center gap-2">
      <span
        className={cx(
          'font-mono text-lg tabular-nums',
          remaining === 0
            ? 'text-red-600 dark:text-red-400'
            : nearlyUp && running
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-700 dark:text-slate-200',
        )}
      >
        {mm}:{ss}
      </span>
      {label && <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>}
      <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={running ? pause : start} disabled={remaining === 0}>
        {running ? '暂停' : '开始'}
      </button>
      <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={reset}>
        重置
      </button>
    </div>
  );
}
