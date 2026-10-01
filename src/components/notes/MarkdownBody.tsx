import ReactMarkdown from 'react-markdown';
import { cx } from '../../utils/ui';

/** Markdown 渲染。样式手写而不引 typography 插件，省一个依赖。 */
export function MarkdownBody({ source }: { source: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-5">{children}</ol>,
        code: ({ children }) => (
          <code className={cx('rounded bg-slate-100 px-1 py-0.5 text-[0.9em] dark:bg-slate-800')}>{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-2 border-l-2 border-slate-300 pl-3 text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
