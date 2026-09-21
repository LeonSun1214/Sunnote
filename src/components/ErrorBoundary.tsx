import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RAW_STORAGE_KEY, findSnapshot } from '../store/storage';
import { downloadFile } from '../utils/exportMarkdown';
import { todayKey } from '../utils/date';

interface State {
  error: Error | null;
}

/**
 * 崩溃兜底。
 *
 * 为什么非有不可：数据只存在用户自己的浏览器里，没有服务器副本。一旦渲染抛异常
 * 就是白屏，用户进不了设置页、导不出数据 —— 数据其实还在 localStorage 里，
 * 但从用户的角度就是「丢了」，接下来很可能去清缓存，那才是真的没了。
 *
 * 所以这个界面只需要做好一件事：**不依赖 React 状态，直接从 localStorage
 * 读原始串给出下载按钮**。把「我的数据丢了」变成「这是你的 JSON 文件」。
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('应用崩溃', error, info.componentStack);
  }

  /** 直接读 localStorage，绕开所有可能已经坏掉的应用状态。 */
  private handleExportRaw = () => {
    try {
      const raw = localStorage.getItem(RAW_STORAGE_KEY);
      const snapshot = findSnapshot();
      // 快照和当前数据都给 —— 不知道哪份是好的，两份都拿走最安全
      const payload = JSON.stringify(
        { exportedAt: new Date().toISOString(), current: raw, snapshot: snapshot?.raw ?? null },
        null,
        2,
      );
      downloadFile(`sunnote-抢救导出-${todayKey()}.json`, payload, 'application/json');
    } catch (error) {
      console.error('抢救导出失败', error);
      window.alert('导出失败了。按 F12 打开控制台，运行 localStorage.getItem("sunnote:data") 可以手动复制出来。');
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-6 py-12">
        <div>
          <h1 className="text-xl font-semibold">应用出错了</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">你的数据还在浏览器里，没有丢。</strong>
            先把它导出来存好，再尝试重新加载。
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            在拿到导出文件之前，<strong className="text-slate-900 dark:text-slate-100">不要清缓存、不要卸载重装</strong>
            —— 那会真的把数据删掉。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={this.handleExportRaw} className="btn-primary">
            导出原始数据
          </button>
          <button type="button" onClick={() => window.location.reload()} className="btn-ghost">
            重新加载
          </button>
        </div>

        <details className="text-xs text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer">技术细节</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack}
          </pre>
        </details>
      </div>
    );
  }
}
