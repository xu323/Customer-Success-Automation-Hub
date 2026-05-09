/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Fluent 2 brand ----
        brand: {
          50: "#EFF6FC",
          100: "#DEECF9",
          200: "#C7E0F4",
          300: "#A0D0F5",
          400: "#2B88D8",
          500: "#0078D4",
          600: "#106EBE",
          700: "#005A9E",
          800: "#004578",
          900: "#002F5A",
        },
        // ---- Fluent 2 neutrals ----
        neutral: {
          0: "#FFFFFF",
          10: "#FAF9F8",
          20: "#F3F2F1",
          30: "#EDEBE9",
          40: "#E1DFDD",
          60: "#C8C6C4",
          90: "#A19F9D",
          130: "#605E5C",
          160: "#323130",
          190: "#201F1E",
        },
        // ---- Fluent 2 semantic ----
        success: { DEFAULT: "#107C10", bg: "#DFF6DD" },
        warning: { DEFAULT: "#797673", bg: "#FFF4CE" },
        danger: { DEFAULT: "#A4262C", bg: "#FDE7E9" },
        info: { DEFAULT: "#0078D4", bg: "#DEECF9" },
        // ---- Legacy ms-* aliases remapped to Fluent neutrals so existing
        // class names keep working under the new light theme. ----
        ms: {
          blue: "#0078D4",     // brand-500
          dark: "#FAF9F8",     // page bg (was navy) → neutral-10
          surface: "#FFFFFF",  // card bg (was navy) → white
          line: "#E1DFDD",     // borders → neutral-40
          text: "#201F1E",     // primary text → neutral-190
          muted: "#605E5C",    // secondary text → neutral-130
        },
      },
      fontFamily: {
        sans: [
          '"Segoe UI Variable Display"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          '"Microsoft JhengHei UI"',
          '"Yu Gothic UI"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"Cascadia Code"',
          '"Cascadia Mono"',
          "Consolas",
          '"Courier New"',
          "monospace",
        ],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        "2xl": "12px",
      },
      boxShadow: {
        // Fluent 2 elevation tokens
        card: "0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108)",
        flyout: "0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108)",
        modal: "0 25.6px 57.6px 0 rgba(0,0,0,0.22), 0 4.8px 14.4px 0 rgba(0,0,0,0.18)",
      },
      // Density tokens (paired with the data-density attribute on <html>)
      // The CSS in index.css references these via var(--row-h, 32px).
      spacing: {
        "row-compact": "28px",
        "row-default": "32px",
        "row-comfy": "40px",
      },
    },
  },
  plugins: [],
};
