import { useRef, useState } from 'react';
import type { ThemeSetting } from '../types';
import { useAppData } from '../store/hooks';
import { exportMarkdown, downloadFile } from '../utils/exportMarkdown';
import { DATA_VERSION } from '../store/storage';
import type { ImportMode } from '../store/storage';
import { daysSince, todayKey } from '../utils/date';
import { cx } from '../utils/ui';

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

export function SettingsPage() {
  const { data, updateSettings, importData, resetData } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pendingMode, setPendingMode] = useState<ImportMode>('merge');

  const counts = {
    sessions: data.sessions.length,
    notes: data.notes.length,
    vocab: data.vocab.length,
    phrases: data.phrases.length,
  };
  const sinceExport = daysSince(data.settings.lastExportedAt);

  const handleExportJson = () => {
    downloadFile(`sunnote-backup-${todayKey()}.json`, JSON.stringify(data, null, 2), 'application/json');
    updateSettings({ lastExportedAt: new Date().toISOString() });
    setStatus({ tone: 'ok', text: 'JSON 备份已导出。换设备或清缓存前记得留一份。' });
  };

  const handleExportMarkdown = () => {
    downloadFile(`sunnote-复习本-${todayKey()}.md`, exportMarkdown(data), 'text/markdown');
    setStatus({ tone: 'ok', text: 'Markdown 复习本已导出。这份是给你看的，导不回来 —— 备份还得用 JSON。' });
  };

  const handleFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const incoming = raw as { version?: number; sessions?: unknown[] };
      if (typeof incoming !== 'object' || incoming === null || !Array.isArray(incoming.sessions)) {
        setStatus({ tone: 'error', text: '这个文件里没有练习记录，不像是 Sunnote 的备份。' });
        return;
      }
      if (incoming.version != null && incoming.version > DATA_VERSION) {
        setStatus({
          tone: 'error',
          text: `备份来自更新版本（v${incoming.version}），当前应用是 v${DATA_VERSION}。请先更新应用再导入。`,
        });
        return;
      }
      const label = pendingMode === 'replace' ? '覆盖' : '合并';
      if (!window.confirm(`确定用${label}方式导入吗？\n\n${pendingMode === 'replace' ? '覆盖会丢掉当前所有数据，不可撤销。' : '合并会保留两边的记录，同一条以修改时间更新的为准。'}`)) {
        return;
      }
      importData(raw, pendingMode);
      setStatus({ tone: 'ok', text: `已${label}导入。` });
    } catch {
      setStatus({ tone: 'error', text: '文件读不出来，可能不是合法的 JSON。' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleReset = () => {
    if (!window.confirm('清空所有数据？练习记录、笔记、生词、句型都会删掉，且不可撤销。\n\n建议先导出一份 JSON 备份。')) return;
    if (!window.confirm('再确认一次：真的要清空吗？')) return;
    resetData();
    setStatus({ tone: 'ok', text: '数据已清空。' });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold">设置</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          数据只存在这个浏览器里，不上传任何服务器。所以备份得你自己来。
        </p>
      </header>

      {status && (
        <p
          className={cx(
            'rounded-lg px-3 py-2 text-xs',
            status.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
          )}
        >
          {status.text}
        </p>
      )}

      <section className="card">
        <h2 className="text-sm font-semibold">当前数据</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat label="练习记录" value={counts.sessions} />
          <Stat label="错题笔记" value={counts.notes} />
          <Stat label="生词" value={counts.vocab} />
          <Stat label="句型" value={counts.phrases} />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {sinceExport === null ? '还没导出过备份。' : `上次备份：${sinceExport} 天前。`}
        </p>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="text-sm font-semibold">导出</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            JSON 是备份，能原样导回来；Markdown 是复习本，方便在别处翻看和打印。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary flex-1" onClick={handleExportJson}>
            导出 JSON 备份
          </button>
          <button type="button" className="btn-ghost flex-1" onClick={handleExportMarkdown}>
            导出 Markdown 复习本
          </button>
        </div>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="text-sm font-semibold">导入</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            选一个之前导出的 JSON 备份。先选好合并方式，再挑文件。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeOption
            selected={pendingMode === 'merge'}
            onSelect={() => setPendingMode('merge')}
            title="合并（推荐）"
            desc="两边的记录都留着。同一条以修改时间更新的为准。"
          />
          <ModeOption
            selected={pendingMode === 'replace'}
            onSelect={() => setPendingMode('replace')}
            title="覆盖"
            desc="丢掉当前全部数据，只保留备份里的内容。"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button type="button" className="btn-ghost w-full" onClick={() => fileRef.current?.click()}>
          选择备份文件…
        </button>
      </section>

      <section className="card">
        <h2 className="mb-2 text-sm font-semibold">外观</h2>
        <div className="flex gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => updateSettings({ theme: t.value })}
              aria-pressed={data.settings.theme === t.value}
              className={cx(
                'flex-1 rounded-lg border px-3 py-2 text-sm transition',
                data.settings.theme === t.value
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">危险操作</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">清空后无法撤销。动手前先导一份 JSON。</p>
        <button type="button" className="btn-danger mt-2 w-full" onClick={handleReset}>
          清空所有数据
        </button>
      </section>

      <p className="pb-2 text-center text-[11px] text-slate-400 dark:text-slate-600">
        数据结构版本 v{DATA_VERSION}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-800">
      <p className="text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ModeOption({
  selected,
  onSelect,
  title,
  desc,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'rounded-lg border px-3 py-2 text-left transition',
        selected
          ? 'border-slate-900 bg-slate-100 dark:border-slate-100 dark:bg-slate-800'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{desc}</span>
    </button>
  );
}
