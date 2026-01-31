import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sui: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e6fe',
          300: '#7cd4fd',
          400: '#36bffa',
          500: '#0c9eeb',
          600: '#0084d4',
          700: '#0168a6',
          800: '#065986',
          900: '#0b4a6f',
          950: '#082f4a',
        },
        walrus: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#ffcdc9',
          300: '#fda9a3',
          400: '#fb766d',
          500: '#f24d42',
          600: '#df2f23',
          700: '#bc231a',
          800: '#9b2119',
          900: '#80221b',
          950: '#460d09',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-sui': 'linear-gradient(135deg, #0c9eeb 0%, #36bffa 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0b1120 0%, #1a2332 100%)',
        'gradient-mesh': 'radial-gradient(at 40% 20%, hsla(228,70%,50%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,70%,50%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,70%,50%,0.3) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(340,70%,50%,0.3) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(22,70%,50%,0.3) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(242,70%,50%,0.3) 0px, transparent 50%), radial-gradient(at 0% 0%, hsla(343,70%,50%,0.3) 0px, transparent 50%)',
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center center',
          },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
        'shimmer': {
          'from': {
            'background-position': '0 0',
          },
          'to': {
            'background-position': '-200% 0',
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
