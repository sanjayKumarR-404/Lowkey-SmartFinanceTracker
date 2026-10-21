# Lowkey Design Guide

This document defines the visual language, interaction patterns, design tokens, and UX rules for **Lowkey** — a personal finance tracker designed for clarity, calm, and confidence.

---

## 1. Product Identity & Philosophy

- **Name:** Lowkey
- **Persona:** A thoughtful, high-craft personal notebook for money. Calm, disciplined, and unobtrusive.
- **Inspiration:** Modern personal finance tools with structured sidebars, distinct cards, spacious typography, and quiet, informative charts.
- **Tone:** Human, respectful, and clear. No tech-startup hype, no unsolicited advice, no fake testimonials or marketing fluff.

---

## 2. Color System & Design Tokens

### Light Theme (Default)
- **Canvas / Background:** `#F7F5F0` (warm off-white / parchment feel)
- **Card / Surface:** `#FFFFFF` (pure crisp white)
- **Surface Hover:** `#FAFAF7`
- **Border:** `#E8E4DA` (thin, warm subtle boundary)
- **Border Focus / Active:** `#1F5A46`
- **Primary Brand:** `#1F5A46` (deep evergreen / forest green)
- **Primary Brand Hover:** `#174636`
- **Primary Brand Soft:** `#EBF2EE` (tinted green background for badges/active states)
- **Secondary Accent:** `#E3A23B` (warm honey amber, used sparingly for alerts or attention)
- **Text Main:** `#1B1F1D` (deep green-black, readable and soft on eyes)
- **Text Muted:** `#5C6661` (secondary labels, metadata)
- **Text Subtle:** `#8A948F` (placeholders, timestamps)
- **Income:** `#2D7A58` (botanical green)
- **Expense:** `#C4553B` (warm terracotta)

### Dark Theme (Theme Toggle / System Preference)
- **Canvas / Background:** `#121715` (deep charcoal-green, never `#000000`)
- **Card / Surface:** `#19201D`
- **Surface Hover:** `#1E2723`
- **Border:** `#26322C`
- **Border Focus / Active:** `#468B71`
- **Primary Brand:** `#37886C`
- **Primary Brand Hover:** `#429C7D`
- **Primary Brand Soft:** `#192A22`
- **Secondary Accent:** `#E5A84B`
- **Text Main:** `#ECF0ED`
- **Text Muted:** `#97A39D`
- **Text Subtle:** `#6B7872`
- **Income:** `#3FA87E`
- **Expense:** `#DE6B52`

### Muted Category Palette
Never use neon or highly saturated primaries. Category tags use balanced, earthy hues:
- Food & Dining: `#8E5B42` (warm umber)
- Housing & Utilities: `#3C6E71` (slate teal)
- Shopping & Retail: `#7D6587` (muted plum)
- Transport & Travel: `#4F7359` (sage green)
- Entertainment: `#A3704C` (clay)
- Health & Wellness: `#5B7B88` (dusty blue)
- Salary & Inflow: `#2D7A58` (botanical green)
- Other / Uncategorized: `#727A75` (neutral slate)

---

## 3. Typography

- **Headings & Big Numbers:** **Fraunces** (Variable font via `@fontsource-variable/fraunces`). Warm serif with distinct editorial character. Used strictly for:
  - Page titles (`h1`)
  - Big metric / money figures (e.g., total balance, monthly spending)
- **Interface & Body:** **Geist** (Variable font via `@fontsource-variable/geist`). Clean, high-legibility geometric sans-serif with tabular numeric figures for tables, forms, nav links, and body text.
- **Rules:**
  - Never use browser defaults (Arial, Times) or generic fonts like Inter and Roboto.
  - Keep heading font sizes restrained: `h1` = 1.75rem / 28px, `h2` = 1.25rem / 20px, `h3` = 1rem / 16px.
  - Numbers in financial rows must use tabular alignment so columns line up perfectly.

---

## 4. Spacing, Geometry & Shadows

- **Grid:** Strict 8px baseline grid (4px, 8px, 12px, 16px, 24px, 32px, 48px).
- **Border Radius:**
  - Cards & Modals: `14px` (range 12–16px)
  - Buttons, Inputs, Selects: `8px` to `10px`
  - Badges & Tags: `6px`
- **Borders & Shadows:**
  - Cards use a single `1px solid var(--border)` and a whisper-soft shadow:
    `box-shadow: 0 1px 3px rgba(27, 31, 29, 0.04), 0 4px 12px rgba(27, 31, 29, 0.02);`
  - In dark mode, shadows fade and borders provide clean separation.
  - No layered glowing dropshadows or heavy glassmorphism.

---

## 5. Numbers, Formatting & Locale

- **Currency:** Indian Rupee symbol `₹` with Indian numbering grouping (Lakhs & Crores):
  - Example: `₹1,25,000.50` (not `₹125,000.50`).
  - Implemented using:
    ```javascript
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
    ```
- **Dates:** Concise and readable without clutter:
  - Format: `21 Oct 2026` (using `date-fns` or native `Intl.DateTimeFormat`).
- **All formatters live in one shared module:** `src/utils/formatters.js`.

---

## 6. What Makes a UI Look "AI-Generated" (Strictly Banned)

| Banned AI Pattern | What Lowkey Does Instead |
| :--- | :--- |
| Purple / indigo / cyan neon gradients | Solid, warm, earthy tones (`#F7F5F0`, deep green `#1F5A46`) |
| Centered landing page with 3 identical feature cards | Functional left sidebar app shell with direct utility |
| "Welcome back, John!" marketing banners | Clean page title: "Dashboard", "Transactions" |
| Floating glowing blobs / blurry circles | Clean, flat surfaces with thin warm borders |
| Stock illustrations or abstract 3D shapes | Clear SVG data charts and crisp CSS previews |
| Emojis in place of icons (💰, 🚀, 📈) | `lucide-react` line icons exclusively |
| Exclamation marks on buttons or alerts | Sentence case, quiet text: "Add transaction", "Save budget" |
| Hard-coded fake numbers in empty states | Explicit empty states with 1 icon, 1 explanatory sentence, and 1 action |
| Heavy glassmorphism (`backdrop-filter: blur(20px)`) | Solid opaque white/dark surfaces |

---

## 7. Motion & Interaction

Powered by the `motion` library (restrained & purposeful):
- **Page Transitions:** Quick fade with an 8px vertical slide (`duration: 0.18s, ease: "easeOut"`).
- **Metric Numbers:** Count-up animation once on page mount.
- **Card Grid:** Gentle staggered fade-in (`staggerChildren: 0.04s`).
- **Micro-interactions:**
  - Card hover: subtle lift by `2px` with a slight shadow expansion.
  - Buttons: gentle scale-down on active/press (`scale: 0.98`).
  - Skeleton loaders: soft shimmer effect with matching border radius. No annoying spinning circles.
- **Accessibility:** Fully respects `@media (prefers-reduced-motion: reduce)`. Animations are completely bypassed if requested by the user's OS.

---

## 8. Layout & Navigation Architecture

### Desktop ($\ge 1024\text{px}$)
- **Left Sidebar (240px fixed width):**
  - Brand header: "Lowkey" in Fraunces serif with an understated green dot.
  - Main Navigation:
    - `Dashboard` (LayoutDashboard icon)
    - `Transactions` (ArrowLeftRight icon)
    - `Budgets` (PieChart icon)
    - `Recurring` (CalendarSync icon)
    - `Import` (FileInput icon)
  - Bottom Footer:
    - Theme toggle (Sun / Moon)
    - User account indicator & Logout button
- **Top Bar:**
  - Page title (e.g. "Dashboard")
  - Quick action: Primary button "+ Add transaction"
  - Quick search trigger button showing `Ctrl+K` badge
- **Command Palette (`Ctrl+K` / `Cmd+K`):**
  - Instant modal for page navigation, theme switching, and quick transaction entry.

### Mobile ($< 1024\text{px}$)
- Desktop sidebar hides.
- Bottom Tab Bar with icons for the 5 primary views.
- Top bar retains page title, theme button, and "+ Add" button.
- Bento cards collapse into a single vertical column.

---

## 9. Form Design & Accessibility

- Every input has an explicit, accessible `<label>`.
- Visible, high-contrast focus rings: `outline: 2px solid var(--primary-focus); outline-offset: 2px;`.
- Inline validation errors in terracotta (`#C4553B`) with informative wording.
- Password inputs have a toggle button for show/hide password.
- WCAG AA contrast ratio achieved across both light and dark themes.
