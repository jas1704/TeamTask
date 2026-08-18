/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        paper: '#F5F7FA',
        panel: '#FFFFFF',
        line: '#E2E8F0',
        teal: {
          50: '#EFFCFA',
          100: '#CCF7EF',
          400: '#2DD4C4',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
        amber: {
          50: '#FFFBEB',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        coral: {
          400: '#FB7185',
          500: '#F43F5E',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)',
        panel: '0 4px 24px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
