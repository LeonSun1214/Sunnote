import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { SUBJECT_LIST } from '../config/subjects';
import { useAppData } from '../store/hooks';
import { SUBJECT_STYLES, cx } from '../utils/ui';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** 主色类名，用于选中态。 */
  activeText?: string;
}

const PRIMARY_NAV: NavItem[] = [{ to: '/', label: '仪表盘', icon: '◎' }];

const SUBJECT_NAV: NavItem[] = SUBJECT_LIST.map((s) => ({
  to: `/${s.key}`,
  label: s.label,
  icon: { listening: '🎧', reading: '📖', writing: '✍️', speaking: '🎙️' }[s.key],
  activeText: SUBJECT_STYLES[s.key].text,
}));

const LIBRARY_NAV: NavItem[] = [
  { to: '/vocab', label: '生词本', icon: '🔤' },
  { to: '/phrases', label: '句型库', icon: '🧩' },
  { to: '/settings', label: '设置', icon: '⚙︎' },
];

function navClass({ isActive }: { isActive: boolean }, activeText?: string) {
  return cx(
    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
    isActive
      ? cx('bg-slate-200 font-medium dark:bg-slate-800', activeText ?? 'text-slate-900 dark:text-slate-100')
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900',
  );
}

function useTheme() {
  const { data } = useAppData();
  const theme = data.settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

export function AppShell() {
  useTheme();

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* 桌面端侧边栏 */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 p-4 lg:block dark:border-slate-800">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold">Sunnote</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">托福备考笔记 · 2026 新版</p>
        </div>
        <nav className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end className={(s) => navClass(s)}>
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-600">
            四门科目
          </p>
          {SUBJECT_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={(s) => navClass(s, item.activeText)}>
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-600">
            积累
          </p>
          {LIBRARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={(s) => navClass(s)}>
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <p className="font-semibold">Sunnote</p>
        <NavLink to="/settings" className="text-sm text-slate-500 dark:text-slate-400">
          ⚙︎
        </NavLink>
      </header>

      <main className="min-w-0 flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-8 lg:pb-8">
        <Outlet />
      </main>

      {/* 移动端底部标签栏 */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {[PRIMARY_NAV[0], ...SUBJECT_NAV].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] transition',
                isActive
                  ? cx('font-medium', item.activeText ?? 'text-slate-900 dark:text-slate-100')
                  : 'text-slate-500 dark:text-slate-500',
              )
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
