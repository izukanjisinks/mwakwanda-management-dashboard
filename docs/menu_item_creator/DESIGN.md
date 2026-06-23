---
name: Warm Hospitality Narrative
colors:
  surface: '#fff8f5'
  surface-dim: '#e4d8d0'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fef1e9'
  surface-container: '#f8ece3'
  surface-container-high: '#f2e6de'
  surface-container-highest: '#ece0d8'
  on-surface: '#201a16'
  on-surface-variant: '#50443f'
  inverse-surface: '#362f2a'
  inverse-on-surface: '#fbeee6'
  outline: '#82746e'
  outline-variant: '#d4c3bb'
  surface-tint: '#7a5643'
  primary: '#7a5643'
  on-primary: '#ffffff'
  primary-container: '#d6a992'
  on-primary-container: '#5e3d2c'
  inverse-primary: '#ebbda5'
  secondary: '#8c4e2d'
  on-secondary: '#ffffff'
  secondary-container: '#ffae86'
  on-secondary-container: '#793f1f'
  tertiary: '#605e5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#b5b2af'
  on-tertiary-container: '#464543'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ebbda5'
  on-primary-fixed: '#2e1507'
  on-primary-fixed-variant: '#603f2d'
  secondary-fixed: '#ffdbcb'
  secondary-fixed-dim: '#ffb692'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#6f3718'
  tertiary-fixed: '#e5e2df'
  tertiary-fixed-dim: '#c9c6c3'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484745'
  background: '#fff8f5'
  on-background: '#201a16'
  surface-variant: '#ece0d8'
typography:
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  input-text:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 24px
  gutter: 20px
---

## Brand & Style

This design system is built for the culinary and hospitality industry, focusing on a clean, professional, and welcoming atmosphere. The brand personality is grounded and reliable, utilizing a **Corporate / Modern** style infused with organic, warm tones to avoid clinical coldness. 

The aesthetic is defined by high legibility, soft structural elements, and a rhythmic layout that prioritizes ease of use for busy staff. The emotional response is one of calm efficiency, using a "Paper & Spice" metaphor where crisp layouts meet warm, earth-toned accents.

## Colors

The palette is centered on a warm, neutral foundation. 
- **Primary:** A soft terracotta/dusty rose used for primary actions and highlights.
- **Secondary:** A deep chocolate brown reserved for semantic emphasis, toggles, and critical icons.
- **Backgrounds:** A tiered system of creams. The base page uses a subtle off-white, while containers use a pure "Cream" (#FDF9F6) to create soft contrast.
- **Typography:** Neutral tones are skewed toward warm grays and deep browns to maintain harmony with the background, rather than using pure black.

## Typography

The typography system uses **Hanken Grotesk** to provide a sharp, contemporary feel that remains approachable. 

- **Hierarchy:** Established through weight rather than dramatic size shifts. Headings are bold and dark (#2D2926), while helper text and labels use lighter weights and mid-tone browns.
- **Readability:** Generous line heights are maintained to ensure form fields and list items are easily scannable in high-activity environments.
- **Case Styling:** Sentence case is preferred across all UI labels to maintain a friendly, conversational tone.

## Layout & Spacing

This design system employs a **Fluid Grid** model with high-density internal spacing and generous external margins.

- **Grid:** A 12-column system for desktop, collapsing to 1 column for mobile. 
- **Rhythm:** An 8px base unit drives all dimensions. 
- **Form Layout:** Fields are grouped logically with 20px gutters. Long-form inputs (like descriptions) span the full width of their container, while shorter inputs (price, category) are tiled to maximize vertical space.
- **Mobile Adaptation:** On mobile devices, container padding reduces to 16px, and all horizontal form groups stack vertically to maintain tap-target integrity.

## Elevation & Depth

Depth is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than aggressive shadows.

- **Surface Levels:** The background uses a warm neutral tint. Main content areas sit on a "Level 1" surface—white or very light cream containers with a 1px border (#EAE2DC).
- **Outlines:** Input fields and secondary containers use a subtle border to define boundaries. 
- **Shadows:** Only used for "floating" elements like dropdown menus or modals. When used, shadows are highly diffused (20px-30px blur) with a warm tint (#453020 at 5% opacity) to prevent a "dirty" look on the cream background.

## Shapes

The shape language is consistently **Rounded**, reinforcing the friendly and professional personality.

- **Containers:** Large cards and main UI blocks use `rounded-xl` (24px) for a soft, modern enclosure.
- **Inputs & Buttons:** Standard form elements use `rounded-md` (8px) to provide enough structure for professional software while remaining tactile.
- **Toggles:** Use fully rounded (pill) shapes to clearly communicate their interactive state.

## Components

### Buttons
- **Primary:** Filled with the primary terracotta color, white text, and no border. 
- **Secondary:** Transparent background with a 1px border matching the primary color and matching text.
- **States:** Hover states should involve a slight darkening of the fill (10%) to provide immediate feedback.

### Input Fields
- **Background:** White or a very light tint of the secondary color at 5% opacity.
- **Borders:** 1px solid #EAE2DC. On focus, the border transitions to the secondary brown.
- **Labels:** Positioned above the field in `label-bold` style, with a red asterisk for required fields.

### Toggles
- The switch track uses a deep brown (#8C4E2D) when active, with a white circular thumb. The label sits to the right, indicating state (e.g., "Available").

### Cards
- Used to wrap logical sections like "Add Menu Item". Includes a standard header with a `headline-md` title and `body-md` description. Internal padding is strictly 24px.