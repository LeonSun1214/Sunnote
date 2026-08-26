/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 四科各有主色，贯穿导航、徽章和图表
        listening: '#6366f1',
        reading: '#10b981',
        writing: '#f59e0b',
        speaking: '#ec4899',
      },
    },
  },
  plugins: [],
};
