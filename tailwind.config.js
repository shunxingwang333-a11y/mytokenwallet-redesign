/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { ink: '#172522', moss: '#4d6c54', lime: '#d7f279', paper: '#f7f8f6' }, fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['Manrope', 'Inter', 'sans-serif'] }, boxShadow: { soft: '0 18px 60px rgba(34,53,44,.08)' } } },
  plugins: []
}
