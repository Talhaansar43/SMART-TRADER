import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
      },
    },
  },
  plugins: [],
}
export default config
