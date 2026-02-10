/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Work Sans", "Segoe UI", "sans-serif"]
      },
      colors: {
        panel: "var(--rig-panel)",
        panelBorder: "var(--rig-panel-border)",
        accent: "var(--rig-accent)",
        muted: "var(--rig-muted)",
        text: "var(--rig-text)"
      }
    }
  },
  plugins: []
};
