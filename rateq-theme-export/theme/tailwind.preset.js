/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f3',
          100: '#fce4e7',
          200: '#f9c8cf',
          300: '#f3a0ac',
          400: '#e86b7e',
          500: '#8E2157',
          600: '#5a0f1c',
          700: '#4a0c17',
          800: '#3a0912',
          900: '#2a060d',
        },
        gold: {
          50: '#fdf8ef',
          100: '#faefd9',
          200: '#f5ddb3',
          300: '#edc56f',
          400: '#e8b84d',
          500: '#d4a017',
          600: '#b8860b',
        },
        ink: {
          DEFAULT: '#373737',
          muted: '#6b7280',
          light: '#9ca3af',
        },
        dm: {
          bg: '#323232',
          surface: '#383838',
          elevated: '#404040',
          hover: '#454545',
          border: '#4a4a4a',
        },
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-noto-arabic)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '1172px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.06)',
        hero: '0 8px 40px rgba(107, 18, 33, 0.08)',
      },
    },
  },
  plugins: [],
};

module.exports = preset;
