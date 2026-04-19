import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './styles/themes.css';

// 全局初始化主题 - 确保刷新页面时主题正确加载
const THEME_KEY = 'dream-daily-theme';
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
} else {
  // 默认深色主题
  document.documentElement.setAttribute('data-theme', 'dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
