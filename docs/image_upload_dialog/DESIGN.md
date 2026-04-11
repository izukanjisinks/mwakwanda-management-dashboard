# Design System Document: The Modern Lodge

## 1. Overview & Creative North Star
### Creative North Star: "The Digital Concierge"
This design system is built to transform a utilitarian Lodge Management System into a premium, editorial-grade hospitality experience. We move beyond the "grid of data" by treating every screen as a curated guest ledger. The aesthetic is rooted in **Organic Sophistication**—utilizing the warmth of artisanal earth tones (Browns and Creams) paired with the precision of high-end editorial typography.

The system breaks the "template" look through:
*   **Intentional Asymmetry:** Using generous whitespace and varying column widths to avoid the rigidity of standard CRM layouts.
*   **Tonal Depth:** Replacing harsh lines with soft shifts in background color.
*   **Tactile Surfaces:** UI elements feel like fine stationery or smooth stone, rather than digital plastic.

---

## 2. Colors
Our palette is a sophisticated blend of raw earth and luxury cream, designed to evoke the serenity of a high-end retreat.

### Core Palette
*   **Primary (Earthy Strength):** `#6c2f00` (Primary) for high-importance interactions and `#8b4513` (Primary Container) for branding and prominent UI elements.
*   **Secondary (Natural Warmth):** `#7c5730` (Secondary) for subtle accents and navigation depth.
*   **Surface (The Canvas):** `#fdf9f6` (Background) serves as our "paper" base. It is warm, inviting, and reduces eye strain compared to pure white.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** To achieve a premium look, boundaries must be defined solely through background color shifts. Use `surface_container_low` for the main canvas and `surface_container_highest` or `surface_container_lowest` for nested elements.

### Surface Hierarchy & Nesting
Treat the UI as physical layers. An inner card should not have a border; it should be a "sheet" of `surface_container_lowest` (#ffffff) sitting atop a `surface_container` (#f1edea) background. This creates a natural, soft definition that feels expensive and intentional.

### Signature Textures
*   **Glassmorphism:** For floating modals and dropdowns, use the surface color at 80% opacity with a `20px` backdrop-blur.
*   **Tonal Gradients:** For primary CTAs, use a subtle vertical gradient from `primary` (#6c2f00) to `primary_container` (#8b4513) to add "soul" to the action buttons.

---

## 3. Typography
The typography system uses a dual-font strategy to balance character with readability.

*   **Display & Headlines (Manrope):** Chosen for its geometric but friendly letterforms. It feels authoritative yet modern.
    *   *Display-LG (3.5rem):* Reserved for high-impact landing areas.
    *   *Headline-MD (1.75rem):* Used for primary page titles to create an editorial feel.
*   **Body & Labels (Inter):** The industry standard for legibility. 
    *   *Body-MD (0.875rem):* The workhorse for all lodge data and management tables.
    *   *Label-MD (0.75rem):* Used for status badges and micro-copy.

**Editorial Hierarchy:** Always pair a bold `Manrope` headline with a light or regular `Inter` subline. This contrast conveys the brand's premium identity.

---

## 4. Elevation & Depth
Elevation is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Stack `surface_container` tiers. A `surface_container_lowest` card on a `surface_container_low` section creates a soft, organic lift.
*   **Ambient Shadows:** For "floating" elements like Modals, use extra-diffused shadows: `0 12px 40px rgba(135, 115, 105, 0.08)`. The shadow is a tinted brown (from the `outline` token) to mimic natural light filtered through a lodge environment.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` token at **20% opacity**. Pure, opaque borders are forbidden.

---

## 5. Components

### Buttons
*   **Primary:** Rounded (`0.5rem`), using the `primary` to `primary_container` gradient. Text is `on_primary` (#ffffff).
*   **Secondary:** `surface_container_high` background with `on_surface` text. No border.
*   **Tertiary:** Ghost style using `primary` text. Use only for low-emphasis actions like "Cancel."

### Status Chips (Badges)
*   **Available (Success):** `tertiary_fixed` (#d7eab0) background with `on_tertiary_fixed` (#131f00) text.
*   **Unavailable (Error):** `error_container` (#ffdad6) background with `on_error_container` (#93000a) text.
*   *Styling:* Use "full" roundedness (9999px) and Inter Label-MD.

### Data Tables
*   **Header:** `title-sm` typography, `on_surface_variant` color. 
*   **Rows:** Remove all vertical and horizontal lines. Use a `surface_container_low` hover state to highlight rows.
*   **Spacing:** Use generous `1.5rem` vertical padding for rows to let the data breathe.

### Minimalist Modals
*   **Header:** Always centered using `headline-sm`.
*   **Body:** Use `surface_container_lowest` for input fields to create a "recessed" look within the modal container.
*   **Corners:** Apply `xl` (1.5rem) roundedness for a soft, welcoming feel.

---

## 6. Do's and Don'ts

### Do
*   **Do** use whitespace as a structural element. If an element feels cramped, increase the padding rather than adding a line.
*   **Do** use `backdrop-blur` on navigation sidebars and modals to maintain a sense of environmental depth.
*   **Do** use centered typography for modals and empty states to reinforce the "editorial" aesthetic.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#1c1b1a) to maintain the warm, organic tone.
*   **Don't** use standard "drop shadows" with 20%+ opacity. They break the soft, high-end atmosphere.
*   **Don't** use 1px solid borders to separate table rows or dashboard widgets. Use tonal shifts in the `surface_container` scale instead.
*   **Don't** use sharp corners. Every element, from chips to large containers, must adhere to the `8px - 24px` (sm to xl) roundedness scale.