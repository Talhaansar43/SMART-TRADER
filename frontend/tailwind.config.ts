import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f5f8f6',
          100: '#ebf1ed',
          200: '#d8e3dc',
          300: '#c2d1c7',
          400: '#8fa294',
          500: '#687b6d',
          600: '#4d6053',
          700: '#35483b',
          800: '#26362c',
          900: '#17261d',
          950: '#0d1912',
        },
        green: {
          50: '#eef7f1',
          100: '#dcefe2',
          200: '#bce0c9',
          300: '#8dc9a4',
          400: '#57ad7a',
          500: '#2b915a',
          600: '#197849',
          700: '#155f3c',
          800: '#124c32',
          900: '#103d2a',
          950: '#09271a',
        },
        accent: '#0f766e',
        danger: '#bd4c49',
        warning: '#a46914',
        success: '#197849',
      },
    },
  },
  plugins: [],
}
export default config
