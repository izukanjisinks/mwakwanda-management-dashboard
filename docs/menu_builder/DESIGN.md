---
name: Organic Management System
colors:
  surface: '#fff8f3'
  surface-dim: '#e3d8cd'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fdf2e6'
  surface-container: '#f7ece1'
  surface-container-high: '#f1e6db'
  surface-container-highest: '#ece1d6'
  on-surface: '#201b14'
  on-surface-variant: '#53433e'
  inverse-surface: '#352f28'
  inverse-on-surface: '#faefe4'
  outline: '#86736d'
  outline-variant: '#d8c2ba'
  surface-tint: '#8d4e33'
  primary: '#6f361e'
  on-primary: '#ffffff'
  primary-container: '#8c4d33'
  on-primary-container: '#ffcdba'
  inverse-primary: '#ffb599'
  secondary: '#605e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2de'
  on-secondary-container: '#666461'
  tertiary: '#77310e'
  on-tertiary: '#ffffff'
  tertiary-container: '#954823'
  on-tertiary-container: '#ffcdb9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#70371f'
  secondary-fixed: '#e6e2de'
  secondary-fixed-dim: '#cac6c2'
  on-secondary-fixed: '#1d1b19'
  on-secondary-fixed-variant: '#484644'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb597'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#77320e'
  background: '#fff8f3'
  on-background: '#201b14'
  surface-variant: '#ece1d6'
typography:
  headline-xl:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  sidebar-width: 280px
  container-padding: 32px
  gutter: 24px
  stack-sm: 12px
  stack-md: 24px
---

## Brand & Style

This design system is built for the hospitality and service industry, specifically focusing on the intersection of administrative efficiency and high-end aesthetic value. The brand personality is grounded, sophisticated, and dependable. It avoids the cold, clinical feel of traditional SaaS by utilizing a "Warm Minimalism" style.

The UI evokes a sense of calm and spatial clarity, allowing servers and managers to navigate complex menu structures without cognitive fatigue. It leverages quality typography and generous whitespace to create an editorial feel, making the management of digital menus feel as premium as the physical dining experience itself.

## Colors

The palette is derived from natural, earth-toned elements. The primary color is a rich, burnt umber that provides high-contrast "call-to-action" moments. The secondary color is a warm cream, used primarily for large background surfaces to reduce eye strain compared to pure white.

A system of warm neutrals manages the typography and borders, ensuring that the interface feels cohesive and "baked-in." Functional colors (success, error) should be muted to match the desaturated nature of the earth-tone palette, using olive greens and terracotta reds instead of neon variants.

## Typography

The typography strategy employs a sophisticated pairing of a classic serif for headlines and a modern geometric sans-serif for functional UI elements. 

- **Noto Serif** is used for page titles and section headers to provide an authoritative, editorial quality that reflects the brand's premium positioning.
- **Manrope** handles all data-heavy tasks, navigation elements, and body text. Its balanced proportions ensure legibility in dense menu management screens.

Maintain a strict vertical rhythm by adhering to the defined line heights. Use uppercase styles for `label-sm` to create a clear distinction for categories and metadata.

## Layout & Spacing

The layout utilizes a fixed sidebar navigation paired with a fluid content area. This structure provides a persistent anchor for system users who need to switch between different management modules rapidly.

The content area follows a 12-column grid system but prioritizes "Tonal Containers" (cards) over raw grid alignment. Spacing is generous, following an 8px base unit. Margins within management cards should be consistent (24px) to ensure that nested menu information (prices, descriptions, ingredients) remains legible and organized.

## Elevation & Depth

This design system avoids heavy drop shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**. 

Depth is communicated through color-stepping:
1. **Base Layer:** The sidebar uses pure white (#FFFFFF) to stand out as the primary control anchor.
2. **Surface Layer:** The main content background uses the secondary cream (#F8F3EF).
3. **Card Layer:** Interactive elements and menu cards use pure white (#FFFFFF) with a very thin, 1px border in a light neutral tone (#EAE0D5).

This approach creates a flat, organized stack that feels integrated into the page rather than floating above it. Shadows, if used, should be limited to active modals and should be "Ambient Shadows"—highly diffused with a slight tint of the primary brown.

## Shapes

The shape language is "Rounded," utilizing a 0.5rem (8px) base radius for standard cards and input fields. This softened geometry balances the professional serif typography, making the management experience feel more approachable and modern.

- **Standard Elements:** 8px (0.5rem)
- **Large Containers/Cards:** 16px (1rem)
- **Chips/Badges:** Pill-shaped (Full radius)

## Components

### Buttons
- **Primary:** Solid Burnt Umber (#8C4D33) with White text. Used for "Create" or "Save" actions.
- **Secondary:** Outlined with a 1px border in the Primary color. Used for "Edit" or "Cancel".
- **Ghost:** No border or background, only Primary-colored text for low-priority actions like "View Details".

### Cards
Cards are the primary vehicle for menu items. They should feature a white background, the standard 8px radius, and a subtle border. Internal sections of the card (like price displays) should use a light cream background (#FAF7F4) to create internal hierarchy.

### Input Fields
Inputs should be clean with a 1px neutral border. Upon focus, the border transitions to the primary brown. Labels must always be visible above the field using the `label-md` typographic style.

### Chips & Status Indicators
Status badges (e.g., "Active", "Sold Out") should use pill-shaped containers with a low-opacity background of the primary color and dark text to ensure they are noticeable but not jarring.

### Sidebar Navigation
The sidebar should use high-contrast text. Active states are indicated by a soft, rounded background highlight or a vertical bar on the leading edge using the primary color. Icons should be line-based and maintain a consistent weight (2px) to match the Manrope typeface.