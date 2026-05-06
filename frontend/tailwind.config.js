/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base:    "#0a0d12",
          surface: "#111419",
          card:    "#181c23",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        "slide-up":   "slideUp 0.22s cubic-bezier(0.16,1,0.3,1)",
        "fade-in":    "fadeIn 0.18s ease-out",
        "pop":        "pop 0.15s cubic-bezier(0.34,1.56,0.64,1)",
        "blink":      "blink 1.2s step-end infinite",
        "pulse-slow": "pulse 2.5s ease-in-out infinite",
      },
      keyframes: {
        slideUp: { from: { opacity:"0", transform:"translateY(10px)" }, to: { opacity:"1", transform:"translateY(0)" } },
        fadeIn:  { from: { opacity:"0" }, to: { opacity:"1" } },
        pop:     { from: { opacity:"0", transform:"scale(0.92)" }, to: { opacity:"1", transform:"scale(1)" } },
        blink:   { "0%,100%": { opacity:"1" }, "50%": { opacity:"0" } },
      },
      boxShadow: {
        "glow-green": "0 0 24px rgba(16,185,129,0.3)",
        "msg":        "0 1px 2px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};
