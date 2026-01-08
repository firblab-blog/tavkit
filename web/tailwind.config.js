/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
      },
      colors: {
        // Legacy color names (mapped to CSS variables for theme switching)
        'tavern-darkest': 'var(--color-darkest)',
        'tavern-dark': 'var(--color-dark)',
        'tavern-purple': 'var(--color-border)',
        'tavern-mauve': 'var(--color-text-muted)',
        'tavern-terra': 'var(--color-accent)',
        'tavern-gold': 'var(--color-primary)',
        'tavern-cream': 'var(--color-text)',
        'tavern-light': 'var(--color-text)',
        'tavern-cyan': 'var(--color-primary-light)',
        'tavern-green': 'var(--color-primary)',
        'tavern-red': '#ff6b6b',
        
        // Semantic assignments for consistency
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          light: 'var(--color-primary-light)',
        },
        secondary: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-border)',
          light: 'var(--color-primary-light)',
        },
        background: {
          DEFAULT: 'var(--color-darkest)',
          panel: 'var(--color-panel)',
          card: 'var(--color-border)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          bright: 'var(--color-text)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-text-muted)',
        },
      },
    },
  },
  plugins: [],
}
