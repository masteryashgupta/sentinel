/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        void: "#0a0e0c",
        panel: "#0f1512",
        line: "#1e2a24",
        signal: "#39ff8f",
        signalDim: "#1f8a52",
        amber: "#ffb454",
        crimson: "#ff5c5c",
        muted: "#5c6b64",
      },
      boxShadow: {
        glow: "0 0 20px rgba(57, 255, 143, 0.15)",
      },
      keyframes: {
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-slide-up": "fade-slide-up 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};
