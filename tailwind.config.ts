import type { Config } from 'tailwindcss'
const config: Config = { darkMode: ['class'], content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#101116', paper: '#F7F7F5', line: '#E7E6E1', coral: '#F06A55', gold: '#F5C969' }, fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'], display: ['Georgia', 'serif'] }, boxShadow: { card: '0 1px 3px rgba(16,17,22,.04), 0 8px 30px rgba(16,17,22,.04)' } } }, plugins: [require('tailwindcss-animate')] }
export default config
