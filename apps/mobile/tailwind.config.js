/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.tsx'],
  theme: {
    extend: {
      colors: {
        primary: '#0066FF',
        secondary: '#FF6B35',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        background: '#FFFFFF',
        'background-secondary': '#F9FAFB',
        text: '#1F2937',
        'text-secondary': '#6B7280',
        border: '#D1D5DB',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '28px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
      },
    },
  },
  plugins: [],
};
