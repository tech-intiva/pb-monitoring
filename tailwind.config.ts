import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f14',
        panel: '#121821',
        foreground: '#e6edf3',
        muted: {
          DEFAULT: '#9aa7b2',
          foreground: '#9aa7b2',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: '#121821',
          foreground: '#e6edf3',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        status: {
          ok: '#22c55e',
          warn: '#f59e0b',
          error: '#ef4444',
        },
        project: {
          cyclops: '#1877F2',      // Azure Blue
          defiant: '#00FEA8',      // Neon Mint
          skyarmyv1: '#F42D2D',    // Crimson Red
          enigma: '#FE9F00',       // Amber Orange
          skyarmyv2: '#F42D2D',    // Crimson Red
          deimos: '#D92F20',       // Vermilion Red
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
