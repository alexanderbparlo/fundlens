/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette — deep charcoal + precision cyan
        surface: {
          50:  '#f0f4f8',
          100: '#d9e2ec',
          800: '#1a1f2e',   // card background
          900: '#0f1420',   // panel background
          950: '#080c14',   // page background
        },
        accent: {
          DEFAULT: '#00c8b4',   // primary teal
          dim:     '#00a898',   // hover state
          muted:   '#00c8b41a', // 10% opacity for backgrounds
          border:  '#00c8b433', // 20% opacity for borders
        },
        data: {
          positive: '#22d37a',  // positive metrics
          negative: '#f05252',  // negative metrics / alerts
          neutral:  '#8892a4',  // null / unavailable
          override: '#f5a623',  // manual override indicator
          flag:     '#f5a623',  // flagged items
        },
        text: {
          primary:   '#e8edf5',
          secondary: '#8892a4',
          muted:     '#4a5568',
          label:     '#6b7785',
        },
      },
      fontFamily: {
        // Display: sharp, modern, financial
        display: ['var(--font-display)', 'system-ui'],
        // Body: clean, readable
        body:    ['var(--font-body)', 'system-ui'],
        // Data: monospace for numbers and values
        mono:    ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'data-xl': ['1.5rem',   { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'data-lg': ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'data-sm': ['0.75rem',  { lineHeight: '1.4', letterSpacing: '0.02em'  }],
        'label':   ['0.6875rem',{ lineHeight: '1.4', letterSpacing: '0.08em'  }],
      },
      borderRadius: {
        'panel': '2px',
        'card':  '4px',
        'chip':  '2px',
      },
      boxShadow: {
        'panel': '0 0 0 1px rgba(0, 200, 180, 0.12), 0 4px 24px rgba(0, 0, 0, 0.4)',
        'card':  '0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow':  '0 0 20px rgba(0, 200, 180, 0.15)',
      },
      animation: {
        'pulse-slow':   'pulse 3s ease-in-out infinite',
        'scan':         'scan 2s ease-in-out infinite',
        'fade-in':      'fadeIn 0.4s ease-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'blink':        'blink 1.2s step-end infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '1'   },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)'   },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
