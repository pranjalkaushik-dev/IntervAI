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
          bg: '#F5F7FB',
          surface: '#FFFFFF',
          panel: '#EEF2F8',
          card: '#FFFFFF',
          cardHover: '#F8FAFC',
          border: '#DFE5EF',
          borderLight: '#EEF2F8',
          borderHighlight: '#365FEA',
          text: '#172033',
          muted: '#596579',
          dim: '#8592A6',
          blue: '#365FEA',
          blueHover: '#2B4DC7',
          softBlue: '#EAF0FF',
          emerald: '#16A34A',
          amber: '#D97706',
          rose: '#DC2626',
          purple: '#6366F1',
          cyan: '#0D9488',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4263EB',
          600: '#3651C9',
          700: '#2A3F9D',
          800: '#1E2D70',
          900: '#141E4B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle-rim': '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px 0 rgba(16, 24, 40, 0.03)',
        'btn-primary': '0 1px 2px 0 rgba(16, 24, 40, 0.08)',
        'card-glow': '0 4px 20px -2px rgba(16, 24, 40, 0.06)',
        'editor': '0 1px 3px 0 rgba(16, 24, 40, 0.08)',
        'dropdown': '0 10px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.06)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
