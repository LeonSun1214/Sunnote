import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import type { Exam, Skill } from '../types';
import { EXAM_LABELS, EXAM_ORDER, SKILL_ORDER, SUBJECT_CONFIGS, isSubject } from '../config/exams';
import { useAppData } from '../store/hooks';
import { subjectStyle, cx } from '../utils/ui';

const SKILL_ICONS: Record<Skill, string> = {
  listening: '🎧',
  reading: '📖',
  writing: '✍️',
  speaking: '🎙️',
};

const LIBRARY_NAV = [
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

/**
 * 当前在哪个考试下。从地址栏推导而不是存状态 —— 刷新、分享链接、前进后退
 * 都自然正确，不用额外同步。不在某个科目页时默认托福。
 */
function useCurrentExam(): Exam {
  const { pathname } = useLocation();
  const first = pathname.split('/')[1] ?? '';
  return isSubject(first) ? SUBJECT_CONFIGS[first].exam : 'toefl';
}

export function AppShell() {
  useTheme();
  const currentExam = useCurrentExam();

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* 桌面端侧边栏：按考试分组 */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 p-4 lg:block dark:border-slate-800">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold">Sunnote</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">托福 · 雅思备考笔记</p>
        </div>
        <nav className="space-y-1">
          <NavLink to="/" end className={(s) => navClass(s)}>
            <span className="w-5 text-center">◎</span>
            仪表盘
          </NavLink>

          {EXAM_ORDER.map((exam) => (
            <div key={exam}>
              <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-600">
                {EXAM_LABELS[exam]}
              </p>
              {SKILL_ORDER.map((skill) => {
                const config = SUBJECT_CONFIGS[`${exam}-${skill}`];
                return (
                  <NavLink
                    key={config.key}
                    to={`/${config.key}`}
                    className={(s) => navClass(s, subjectStyle(config.key).text)}
                  >
                    <span className="w-5 text-center">{SKILL_ICONS[skill]}</span>
                    {config.label}
                  </NavLink>
                );
              })}
            </div>
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

      {/* 移动端顶栏：考试切换 */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <p className="shrink-0 font-semibold">Sunnote</p>
        <div className="flex gap-1 rounded-lg bg-slate-200 p-0.5 dark:bg-slate-800">
          {EXAM_ORDER.map((exam) => (
            <NavLink
              key={exam}
              to={`/${exam}-listening`}
              className={cx(
                'rounded-md px-2.5 py-1 text-xs transition',
                currentExam === exam
                  ? 'bg-white font-medium shadow-sm dark:bg-slate-700'
                  : 'text-slate-500 dark:text-slate-400',
              )}
            >
              {EXAM_LABELS[exam]}
            </NavLink>
          ))}
        </div>
        <NavLink to="/settings" className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
          ⚙︎
        </NavLink>
      </header>

      <main className="min-w-0 flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-8 lg:pb-8">
        <Outlet />
      </main>

      {/* 移动端底栏：当前考试的四科。考试由顶栏切换，这里只跟着走。 */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cx(
              'flex flex-col items-center gap-0.5 py-2 text-[11px] transition',
              isActive ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500',
            )
          }
        >
          <span className="text-base leading-none">◎</span>
          仪表盘
        </NavLink>
        {SKILL_ORDER.map((skill) => {
          const config = SUBJECT_CONFIGS[`${currentExam}-${skill}`];
          return (
            <NavLink
              key={config.key}
              to={`/${config.key}`}
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] transition',
                  isActive
                    ? cx('font-medium', subjectStyle(config.key).text)
                    : 'text-slate-500 dark:text-slate-500',
                )
              }
            >
              <span className="text-base leading-none">{SKILL_ICONS[skill]}</span>
              {config.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
