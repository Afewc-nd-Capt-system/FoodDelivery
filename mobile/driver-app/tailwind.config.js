/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E8621A',
        primaryDark: '#C4501A',
        deep: '#BE3A2A',
        cream: '#FFF8F0',
        tagBg: '#FFF1E8',
        surface: '#FFFFFF',
        textPrimary: '#1C1C1E',
        textSecondary: '#636366',
        textMuted: '#A0A0A0',
        borderSubtle: '#F0EAE0',
        borderMedium: '#E8E8E8',
        darkBg: '#1C1C1E',
        darkSurface: '#2C2C2E',
        success: '#16A34A',
        successBg: '#F0FDF4',
        error: '#D32F2F',
        info: '#2563EB',
        infoBg: '#EFF6FF',
        warning: '#F57C00',
      },
    },
  },
  plugins: [],
};
