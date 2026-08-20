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
        titanium: {
          950: '#080B0F',
          900: '#0D1117',
          800: '#161F2C',
          700: '#222F42',
          600: '#33445C',
        },
        alabaster: {
          50: '#FDFBF7',
          100: '#FAF8F5',
          200: '#F3EFEA',
          300: '#E8E1D7',
          400: '#D6CBBF',
        },
        kono: {
          silver: '#CBD5E1',
          chrome: '#94A3B8',
          gold: '#EAB308',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        }
      },
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '14px',
        '3xl': '16px',
        '4xl': '20px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
      },
      boxShadow: {
        'liquid': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'liquid-glow': '0 0 25px -5px rgba(203, 213, 225, 0.15)',
        'liquid-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
        'liquid-amber': '0 0 25px -5px rgba(245, 158, 11, 0.25)',
        'liquid-rose': '0 0 25px -5px rgba(244, 63, 94, 0.25)',
      },
      keyframes: {
        'shrink-progress': {
          '0%': { width: '100%', opacity: '1' },
          '100%': { width: '0%', opacity: '0.2' },
        },
      },
      animation: {
        'shrink-3s': 'shrink-progress 3000ms linear forwards',
      },
    },
  },
  plugins: [],
};
