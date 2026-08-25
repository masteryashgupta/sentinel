/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        void: "#050505",
        panel: "#0a0a0a",
        elevated: "#121212",
        border: "#1f1f1f",
        borderHover: "#2e2e2e",
        textPrimary: "#f5f5f5",
        textSecondary: "#a1a1aa",
        textMuted: "#52525b",
        accent: "#10b981", // Emerald 500
        accentDim: "#059669", // Emerald 600
        accentSoft: "rgba(16, 185, 129, 0.1)",
        danger: "#ef4444",
        dangerSoft: "rgba(239, 68, 68, 0.1)",
        warning: "#f59e0b",
        warningSoft: "rgba(245, 158, 11, 0.1)",
        info: "#3b82f6",
      },
      boxShadow: {
        glow: "0 0 20px rgba(16, 185, 129, 0.15)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      keyframes: {
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        }
      },
      animation: {
        "fade-slide-up": "fade-slide-up 0.4s ease-out forwards",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
