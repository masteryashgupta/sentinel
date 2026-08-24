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
    },
  },
  plugins: [],
};
