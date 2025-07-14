/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#2C6B6B',
          light: '#3D8989',
          dark: '#1D5050',
          contrastText: '#FFFFFF'
        },
        secondary: {
          main: '#E8F0F0',
          light: '#F5F9F9',
          dark: '#D1E0E0',
          contrastText: '#2C6B6B'
        },
        neutral: {
          white: '#FFFFFF',
          grey100: '#F9FAFB',
          grey200: '#E5E7EB',
          grey300: '#D1D5DB',
          grey400: '#9CA3AF',
          grey500: '#6B7280',
          grey600: '#4B5563',
          grey700: '#374151',
          grey800: '#1F2937',
          grey900: '#111827',
          black: '#000000'
        },
        accent: {
          teal: '#66B2B2',
          sage: '#B8D0D0',
          coral: '#FF8A80',
          gold: '#FFD700'
        },
        semantic: {
          success: '#10B981',
          warning: '#FBBF24',
          error: '#EF4444',
          info: '#3B82F6'
        },
        // Keep the original color scales for backward compatibility
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        teal: {
          50: '#edfafa',
          100: '#d5f5f6',
          200: '#afecef',
          300: '#7edce2',
          400: '#16bdca',
          500: '#0694a2',
          600: '#047481',
          700: '#036672',
          800: '#05505c',
          900: '#014451',
        },
      },
      fontFamily: {
        primary: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        secondary: ['Fraunces', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'], // Keep for backward compatibility
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem'
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em'
      },
      spacing: {
        '0': '0',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '32': '8rem',
        '40': '10rem',
        '48': '12rem',
        '56': '14rem',
        '64': '16rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'md': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px'
      },
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'medium': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2C6B6B 0%, #3D8989 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #E8F0F0 0%, #F5F9F9 100%)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}