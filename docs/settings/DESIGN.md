---
name: Professional Management Dashboard
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#273549'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e4c60'
  on-tertiary-container: '#aebcd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-badge:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  sidebar-width: 260px
  unit-xs: 4px
  unit-sm: 8px
  unit-md: 16px
  unit-lg: 24px
  unit-xl: 48px
---

## Brand & Style

This design system is engineered for high-stakes operational environments where clarity and reliability are paramount. The brand personality is professional, institutional, and impeccably organized. It evokes a sense of "quiet competence," allowing hotel staff to manage complex data without cognitive fatigue.

The visual style follows a **Corporate / Modern** aesthetic. It prioritizes information density through systematic spacing and a restrained color palette. By using structured tonal layers and subtle depth, the UI creates a trustworthy environment that feels both high-tech and human-centric.

## Colors

The color strategy uses "Trust Blues" and "Operational Grays" to establish a professional foundation.
- **Primary Blue:** Used for navigation, selection states, and primary branding elements. It signifies stability and authority.
- **Secondary (Confirm) Teal:** Reserved specifically for "Confirm," "Success," and "Check-in" actions. It is distinct from the primary blue to prevent accidental clicks while maintaining a sophisticated tone.
- **Neutral Palette:** Utilizes a cool Slate/Zinc scale. The background uses a very light off-white to reduce screen glare during long shifts, while borders and text utilize deeper grays for maximum legibility.
- **Alert Colors:** Functional reds and ambers are used sparingly and are desaturated to ensure they signify "Attention" without causing unnecessary panic.

## Typography

This design system utilizes **Inter** for its exceptional readability in data-heavy interfaces. The typographic hierarchy is strictly enforced to guide the user's eye from high-level metrics (Occupancy Rates, Revenue) down to granular guest details.

- **Headlines:** Use tighter letter spacing and heavier weights to anchor sections.
- **Labels:** Utilize small-cap or uppercase styling with increased letter spacing for secondary metadata (e.g., "ROOM TYPE," "BOOKING ID").
- **Numerical Data:** Tabular figures are used in data tables to ensure columns of numbers align perfectly for quick scanning.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid hybrid grid**. The main navigation sidebar is fixed to the left, while the content area utilizes a 12-column fluid grid with a maximum cap to prevent line lengths from becoming unreadable on ultra-wide monitors.

A 4px baseline grid governs all spacing units. Consistent 24px (unit-lg) padding is applied to all major dashboard cards and containers to create a "breathable" interface despite high data density.

## Elevation & Depth

Visual hierarchy in this design system is achieved through **Tonal Layers** and **Ambient Shadows**. 

1.  **Level 0 (Background):** The base canvas uses the softest neutral gray (#F8FAFC).
2.  **Level 1 (Cards/Surface):** White containers with a 1px border (#E2E8F0) and a very soft, diffused shadow (0px 2px 4px rgba(0,0,0,0.05)).
3.  **Level 2 (Dialogs/Popovers):** These elements feature a more pronounced shadow (0px 10px 15px rgba(0,0,0,0.1)) to draw focus and indicate interactivity.

Shadows must never be harsh or pure black; they are tinted with the primary blue to maintain a cohesive, clean aesthetic.

## Shapes

The shape language is characterized by **Soft edges**. A standard corner radius of 0.25rem (4px) is used for small components like checkboxes and tags, while larger containers like cards and dialogs use a 0.5rem (8px) or 0.75rem (12px) radius.

This "Soft" approach balances the rigidity of a professional management tool with a modern, approachable feel. Buttons should never be fully rounded (pill-shaped) as that can feel too casual for a dashboard focused on efficiency.

## Components

### Buttons
- **Primary:** Solid blue with white text. Used for main navigation or "Add New" actions.
- **Confirm (Success):** Solid deep teal. Used exclusively for final confirmation or positive guest actions (e.g., "Complete Check-in").
- **Ghost/Tertiary:** Borderless with blue text. Used for "Cancel" or secondary actions to reduce visual noise.

### Cards & Containers
- All data containers must use white backgrounds with the defined Level 1 shadow and 8px rounded corners.
- Headers within cards should be separated by a subtle 1px horizontal rule.

### Inputs & Forms
- Input fields use a 1px slate border that thickens and changes to the primary blue on focus. 
- Validation states must be clear: red for errors, teal for successful completion.

### Status Chips
- Used for room status (e.g., "Clean," "Dirty," "Out of Order"). These use low-saturation background colors with high-saturation text to ensure high contrast without overwhelming the dashboard's calm aesthetic.

### Data Tables
- Row height should be generous (48px - 56px) to allow for clear tap/click targets. 
- Zebra-striping is discouraged; instead, use subtle hover states to highlight the active row.