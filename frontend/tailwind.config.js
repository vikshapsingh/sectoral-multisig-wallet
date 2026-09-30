/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0d1117',
          900: '#131a24',
          800: '#1b2432',
          700: '#26313f',
          600: '#38465a',
          500: '#586479',
          400: '#8894a6',
          300: '#b7c0cc',
          200: '#dfe4ea',
          100: '#f1f3f6',
        },
        signal: {
          600: '#b8853f',
          500: '#d4a15a',
          400: '#e2b877',
        },
        confirm: {
          600: '#2f7a5c',
          500: '#3f9e78',
        },
        alert: {
          600: '#b04a3f',
          500: '#cc5c4f',
        },
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
