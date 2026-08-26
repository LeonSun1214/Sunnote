import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AppDataProvider } from './store/AppDataContext';
import './index.css';

// 用 HashRouter：GitHub Pages 是静态托管，刷新子路径会 404，hash 路由天然规避这个问题。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AppDataProvider>
  </StrictMode>,
);
