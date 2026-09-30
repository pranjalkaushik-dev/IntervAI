/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arena: {
          bg: '#0a0d14',
          surface: '#111622',
          panel: '#161f30',
          card: '#1c263c',
          cardHover: '#23304c',
          border: '#222f46',
          borderLight: '#2e3d5b',
          borderHighlight: '#3b82f6',
          text: '#f1f5f9',
          muted: '#94a3b8',
          dim: '#64748b',
          blue: '#3b82f6',
          blueHover: '#2563eb',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#ef4444',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle-rim': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.07), 0 1px 3px 0 rgba(0, 0, 0, 0.5)',
        'btn-primary': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 2px 4px 0 rgba(14, 165, 233, 0.3)',
        'card-glow': '0 0 0 1px rgba(59, 130, 246, 0.15), 0 8px 24px -4px rgba(0, 0, 0, 0.5)',
        'editor': '0 0 0 1px #222f46, 0 10px 30px -10px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
