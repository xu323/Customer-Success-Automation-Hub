# CSS / Visual Audit — Customer Success Automation Hub

**Scope**: `apps/web/src/**` (39 source files: `*.ts`, `*.tsx`, `*.css`, `*.html`)

> Phase 1 deliverable. No source changed yet.

---

## 1. Emoji / decorative Unicode characters

### 1.1 Pictographic emoji (U+1F300 – U+1FAFF)

| File | Line | Char | Where | Use |
|---|---|---|---|---|
| `i18n/index.ts` | 13 | 🇹🇼 | `LANGUAGE_LABELS["zh-TW"].flag` | Language switcher flag |
| `i18n/index.ts` | 14 | 🇺🇸 | `LANGUAGE_LABELS.en.flag` | Language switcher flag |
| `i18n/index.ts` | 15 | 🇯🇵 | `LANGUAGE_LABELS.ja.flag` | Language switcher flag |
| `pages/BPMPage.tsx` | 73 | 👤 | `TypeIcon` map (`EmployeePayment`) | Request type icon |

### 1.2 Misc symbol / dingbat (U+2600 – U+27BF, U+27F0 – U+27FF)

| File | Line | Char | Where | Use |
|---|---|---|---|---|
| `pages/AIPage.tsx` | 381 | ✺ | Welcome screen avatar | AI brand mark |
| `pages/AIPage.tsx` | 434 | ✺ | Assistant bubble avatar | AI brand mark |
| `pages/AIPage.tsx` | 506 | ✓ | `typeMap.createTask.icon` | Action card icon |
| `pages/AIPage.tsx` | 507 | ✉ | `typeMap.sendEmail.icon` | Action card icon |
| `pages/AIPage.tsx` | 509 | ⚙ | `typeMap.triggerWorkflow.icon` | Action card icon |
| `pages/AIPage.tsx` | 576 | ✺ | Thinking bubble avatar | AI brand mark |
| `pages/BPMPage.tsx` | 74 | ✈ | `TypeIcon` map (`TravelRequest`) | Request type icon |
| `pages/AutomationPage.tsx` | 784 | ✕ | `NewWorkflowDialog` remove condition button | Inline delete glyph |
| `pages/AutomationPage.tsx` | 858 | ✕ | `NewWorkflowDialog` remove action button | Inline delete glyph |
| `pages/AutomationPage.tsx` | 1122 | ✓ / ✕ | `ExpandedDetail` last-5-runs status icon | Status glyph |
| `pages/OnboardingPage.tsx` | 455 | ✓ | `TaskRow` checkbox check | Checked glyph |
| `pages/OnboardingPage.tsx` | 475 | ✓ | `TaskRow` mark-complete button | Action glyph |
| `components/Modal.tsx` | 60 | ✕ | Close button | Inline close glyph |
| `components/Shell.tsx` | 7-14 | ▦ ◎ ✦ ✓ ⚙ ⚑ ✺ ⌥ | `NAV_ITEMS[*].icon` | Sidebar nav icons (8 items) |
| `components/TrendIndicator.tsx` | 24 | ▲ / ▼ | `arrow` constant | Up/down trend arrow |

### 1.3 Geometric shape / arrow (U+2190 – U+21FF, U+25A0 – U+25FF)

| File | Line | Char | Where | Use |
|---|---|---|---|---|
| `pages/AIPage.tsx` | 266 | ◀ | Sidebar collapse button | Inline glyph |
| `pages/AIPage.tsx` | 310 | ▶ | Sidebar expand button | Inline glyph |
| `pages/AIPage.tsx` | 508 | ↻ | `typeMap.updateOpp.icon` | Action card icon |
| `pages/AuditPage.tsx` | 385 | ▶ | Row chevron in `Row` | Inline expand glyph |
| `pages/OnboardingPage.tsx` | 378 | ▶ | Row chevron in `OnboardingRow` | Inline expand glyph |
| `pages/AutomationPage.tsx` | 91 | ▾ | TipsBar chevron | Inline glyph |
| `pages/AutomationPage.tsx` | 226 | ⋯ | ActionsMenu trigger button | Inline 3-dot glyph |
| `pages/AutomationPage.tsx` | 358 | ⌕ | Search input prefix | Inline search glyph |
| `pages/AutomationPage.tsx` | 841 | ↑ | Move-up button | Inline glyph |
| `pages/AutomationPage.tsx` | 850 | ↓ | Move-down button | Inline glyph |
| `pages/AutomationPage.tsx` | 955 | ▶ | FragmentRow row chevron | Inline expand glyph |
| `i18n/locales/{zh-TW,en,ja}.ts` | various | → / ≥ / ≤ | Body copy in subtitles, "Mark won →", "Last 5 runs", `gte`/`lte`, etc. | **Editorial / typographic** — kept as text |
| `pages/AutomationPage.tsx` | 500 | → | Run window separator | **Editorial typography** |

### 1.4 Other text glyphs (kept as text, not visually decorative)

`●` (mock badge dot in Shell), `—` and `…` (em-dash / ellipsis used as content, not as buttons). Per spec these stay as typography.

**Total decorative emoji/symbol occurrences to replace: ~40** across 8 source files.

---

## 2. Tailwind palette / typography / shape

### 2.1 Brand & neutral colours (current)
File: `apps/web/tailwind.config.js`

```js
colors: {
  ms: {
    blue:    "#0078d4",   // accent / primary
    dark:    "#0b1f3a",   // app shell bg
    surface: "#0f172a",   // card bg
    line:    "#1e293b",   // border
    text:    "#e2e8f0",   // primary text
    muted:   "#94a3b8",   // secondary text
  },
}
```

Pages also reach for `slate-*`, `sky-*`, `emerald-*`, `amber-*`, `rose-*`, `violet-*`, `indigo-*` directly from default Tailwind palette. **No `brand`, `neutral`, `success`, `warning`, `danger`, `info` scales exist yet.**

### 2.2 Body background
Defined in `src/index.css`:

```css
body {
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(0,120,212,0.18), transparent 60%),
    radial-gradient(900px 500px at 110% 10%, rgba(99,102,241,0.10), transparent 60%),
    #0b1226;
  color: #e2e8f0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
```

Two glow gradients + dark navy. **Not** D365 BC's clean light/neutral surface — currently dark theme.

### 2.3 Font stack (current)
`tailwind.config.js`:

```js
sans: ["'Segoe UI'", "system-ui", "-apple-system", "Roboto", "Helvetica", "Arial", "sans-serif"]
```

No Variable variant. No mono stack. No webfont link in `index.html`.

### 2.4 Border-radius (current usage)
Grep across components:
- `rounded-md` (most buttons, inputs, modal panels)
- `rounded-lg` (cards, dialogs panels — `Card.tsx` uses `rounded-xl`)
- `rounded-full` (avatars, dots, language pills)
- `rounded-sm` (small chips inside switchers)
- `rounded-xl` only on `components/Card.tsx`, KPI cards in `DashboardPage`

No global radius var. **Spec target = `rounded` (4px) everywhere.**

### 2.5 Shadow (current)
`tailwind.config.js`:

```js
boxShadow: { card: "0 6px 24px -10px rgba(0,0,0,0.45)" }
```

One token, only used by `Card`. Modals use `shadow-xl`, dropdowns use `shadow-xl`. No `shadow-flyout` token.

### 2.6 Card padding (current)
`Card.tsx` uses `p-5` for `CardBody` default. KPI cards in `DashboardPage` use `p-4` / `p-5` mixed.

### 2.7 Table row height
Hard-coded `h-14` (56px) in Automation table, otherwise `py-2` / `py-2.5` / `py-3` ad-hoc. **No density toggle — needs adding.**

---

## 3. Icon libraries

| Library | Status |
|---|---|
| **lucide-react** | ❌ not installed |
| **@radix-ui/react-***  | ❌ not installed |
| **sonner** | ❌ not installed |
| Heroicons / Phosphor / Tabler / etc. | ❌ none installed |

All icons are **inline Unicode glyphs**. There is no icon component library at all.

---

## 4. Native dialog / browser confirm / alert / prompt

ripgrep `\bconfirm\(`, `\balert\(`, `\bprompt\(`, `window.confirm/alert/prompt`:
- **0 matches** in `apps/web/src/`.

The only `alert(...)` style code from earlier prototypes was removed. Good news: **no native dialog code exists to replace** — just need to add radix AlertDialog scaffolding for future destructive confirms.

---

## 5. console.log / debug leaks

ripgrep `console\.log`:
- **0 matches** in `apps/web/src/`.

Already clean.

---

## 6. Demo / placeholder strings

Scanned for `Acme`, `Foo`, `Bar`, `V0001`, `test user`, `demo.user`, `Lorem`, `placeholder@`:

| Pattern | Hits |
|---|---|
| `Acme` | 0 (real) |
| `Foo` | 0 |
| `Bar` | 0 (1 false positive: comment "Filter bar") |
| `V0001` | 0 |
| `test user` | 0 |
| `demo.user` | 0 |
| `Lorem` | 0 |
| `placeholder@` | 0 |
| `Manual demo trigger` | 1 in `AutomationPage.tsx` (run mutation payload) — **demo-flavoured string in code** |
| `manager@partner.com`, `finance@partner.com`, `delivery@partner.com`, `sales@partner.com`, `finance.user@partner.com`, `ops.engineer@partner.com` | many — these are **seed-data emails consistent with the Microsoft Partner persona**, NOT loose demo placeholders. Spec says they fit the system context, leave alone. |
| `Contoso`, `Fabrikam`, `Northwind`, `Adventure Works`, `Tailspin Toys`, `Wide World Importers` | many — **standard Microsoft sample-company names**, leave alone. |
| `CURRENT_USER = "manager@partner.com"` in `BPMPage.tsx:25` | 1 — used as the "logged in" persona for the My-pending tab demo. Move to a single `lib/currentUser.ts` so it can be swapped to real auth later. |

**Conclusion**: nothing offensive (no `Acme`/`test`/`foo`). One mild "Manual demo trigger" literal to soften, plus the hardcoded `CURRENT_USER` to lift to a constants module.

---

## 7. Vendor / package summary

Currently in `package.json`:

| Need | Currently | Action in Phase 2 |
|---|---|---|
| Icon library | none | install `lucide-react` |
| Toast | none | install `sonner` |
| Confirm dialog | none | install `@radix-ui/react-alert-dialog` |
| Variable webfont | none | inline `<link>` to fonts.cdnfonts.com `Segoe UI Variable` (mock for portfolio) |
| Class merger | `clsx` | keep |
| Date / number formatting | `Intl.*` | keep |

---

## 8. Files that will change in Phase 2 (estimate)

| File | Change kind |
|---|---|
| `tailwind.config.js` | Replace palette + fonts + shadow tokens, add `radius` extend |
| `src/index.css` | Light theme, design tokens, density CSS vars, button + form base classes |
| `index.html` | Add Segoe UI Variable webfont link + `lang="zh-Hant"` already set |
| `src/i18n/index.ts` | Drop flag emoji from `LANGUAGE_LABELS`, add Globe rendering in switcher |
| `src/components/Shell.tsx` | Replace 8 sidebar nav icon glyphs with `lucide-react` icons |
| `src/components/LanguageSwitcher.tsx` | Replace flag span with `<Globe />` icon |
| `src/components/Button.tsx` | Add `loading` prop with `Loader2`, refit Fluent variants |
| `src/components/Badge.tsx` | Re-tone for Fluent semantic colours (success / warning / danger / info / brand / neutral) + left dot |
| `src/components/Modal.tsx` | Replace ✕ with `X` icon |
| `src/components/StateMessages.tsx` | Replace inline SVG illustrations with lucide-icon-based illustration |
| `src/components/RefreshButton.tsx` | Replace ⟳ with `RefreshCw` icon |
| `src/components/InfoTip.tsx` | Replace `?` text with `HelpCircle` icon |
| `src/components/TrendIndicator.tsx` | ▲▼ → `ArrowUp` / `ArrowDown` icons |
| `src/components/{TimeRangeSwitcher,Tabs,Avatar,Skeleton,Sparkline,Card,PageHeader}.tsx` | small radius / colour token alignment |
| `src/pages/Shell + 7 pages` | All inline glyphs → lucide; chevrons / search / X / arrows / move-up etc. |
| `src/pages/AIPage.tsx` | ✺ brand → `Sparkles` icon, action card icons → lucide |
| `src/pages/BPMPage.tsx` | 👤 / ✈ → lucide `User` / `Plane`, `$` typography → `DollarSign` |
| `src/lib/currentUser.ts` | NEW — single source for the demo persona |
| `src/components/Toaster.tsx` (or directly in `main.tsx`) | NEW — sonner mount + helper |
| `src/components/ConfirmDialog.tsx` | NEW — radix AlertDialog scaffold |
| `package.json` | Add `lucide-react`, `sonner`, `@radix-ui/react-alert-dialog` |

Estimated **~25 files modified, 3 files created**, ~40 emoji glyphs replaced, ~3 packages added.

---

## 9. Honest constraint declaration

- I cannot run **Playwright** in this sandbox (no Chromium, no GUI). Phase 3 step 5 (15 screenshots) is **not deliverable from this turn**. I will document the exact commands so you can run them.
- I cannot inspect **`Business-Central-Integration-Suite`** (separate repo, not in this workspace). Phase 3 step 6 visual comparison will be expressed as a **alignment checklist** (color/font/radius/density tokens) you can verify side-by-side.
- All other Phase 3 verifications (ripgrep checks, `npm run build`, `npm run lint`) **are deliverable** and will be executed.
