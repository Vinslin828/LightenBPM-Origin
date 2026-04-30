# Figma Style Guide for This Repo

Use this guide when you paste Figma-generated styles and want them applied to existing UI components in this codebase.

## How I Will Apply Figma Styles

### 1) Use Tailwind + Existing Variants First

- Convert Figma styles to Tailwind classes.
- Check `src/index.css` for existing Tailwind variants, tokens, and custom utilities before inventing new classes.
- Prefer existing tokens and utilities over raw hex values.

### 2) Use Existing Icons

- Check `src/components/icons/index.tsx` for a matching icon component before adding new SVGs.
- If a new icon is required, follow `docs/ADD_NEW_ICON.md`.

### 3) Preserve Logic

- If the component already has logic (state, handlers, data mapping), I will **not** replace it with static markup.
- I will integrate styles into the existing structure and keep behavior intact.

### 4) If No Logic Exists, Add Sensible State

- If a component is purely presentational and looks interactive (tabs, dropdowns, toggles, etc.), I will infer a minimal state model and implement it.
- Example: tabs get local state for active tab; dropdowns get open/close state; inputs get controlled value where appropriate.

### 5) Prefer Reusable UI Components

- Always check `src/components/ui` and reuse existing components (`Button`, `Input`, `Checkbox`, `Select`, etc.) instead of re-implementing controls from scratch.

### 6) Avoid Fixed Widths

- Do not set fixed widths on components or their parents unless explicitly required. Prefer responsive layouts (`w-full`, flex, grid) and let containers size naturally.

### 7) Use Border Rather Than Outline

use `border border-stroke rounded-sm` rather than `outline outline-1 outline-stroke outline-off

### 8) Commonly Used Color Varaible

eg: `text-dark`, `border-stroke`, `bg-gray-2`

- dark: #dfe4ea
- stroke: #dfe4ea
- primary-text: #637381
- secondary-text: #8899a8
- lighten-blue: #1a75e0
- gray-2: #f3f4f6
- gray-3: #e5e7eb

### 9) Do not add font-['Inter'] or leading

## What I Need From You When You Paste Figma Styles

Please include:

- The Figma style snippet (text or CSS-like output).
- Target file(s) and component(s) to modify.
- Any constraints (e.g., “keep padding as-is”, “don’t touch layout”).

## Conversion Notes (Tailwind Mapping)

Common mappings I will use:

- Colors: map to tokens in `src/index.css` first.
- Typography: use `text-*`, `font-*`, and `leading-*` utilities; use existing font families defined in the project.
- Spacing: use Tailwind spacing scale; use arbitrary values only if there is no close match.
- Borders: prefer `border` over `outline` unless the design requires outline behavior.
- Radius: use `rounded-*` classes consistent with the rest of the UI.
- Width: avoid `w-[...]` or other fixed width utilities unless you explicitly ask for them.

## Icon Usage

- If Figma references an icon, I will first look for it in `src/components/icons/index.tsx`.
- If it exists, I will use the component directly.
- If it does not exist, I will ask for the SVG path and desired component name and then follow `docs/ADD_NEW_ICON.md`.

## Integration Workflow (What I Will Do)

1. Identify the target component and any existing logic.
2. Map Figma styles to Tailwind classes and existing tokens.
3. Apply styles without breaking behavior.
4. If needed, add minimal state or wiring to match the visual intent.

## Quick Checklist

- Use Tailwind classes and existing tokens (`src/index.css`).
- Use `@/components/ui` components where possible.
- Use icons from `src/components/icons/index.tsx`.
- Preserve existing logic; add minimal state only when necessary.
