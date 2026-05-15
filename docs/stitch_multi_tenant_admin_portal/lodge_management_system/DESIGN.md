---
name: Lodge Management System
colors:
  surface: '#fff8f4'
  surface-dim: '#e1d8d2'
  surface-bright: '#fff8f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2eb'
  surface-container: '#f5ece5'
  surface-container-high: '#f0e7df'
  surface-container-highest: '#eae1da'
  on-surface: '#1f1b17'
  on-surface-variant: '#424842'
  inverse-surface: '#34302b'
  inverse-on-surface: '#f8efe8'
  outline: '#737971'
  outline-variant: '#c2c8bf'
  surface-tint: '#47664b'
  primary: '#17341d'
  on-primary: '#ffffff'
  primary-container: '#2d4b32'
  on-primary-container: '#98ba9a'
  inverse-primary: '#adcfae'
  secondary: '#904c27'
  on-secondary: '#ffffff'
  secondary-container: '#ffa67a'
  on-secondary-container: '#783916'
  tertiary: '#2f2e2a'
  on-tertiary: '#ffffff'
  tertiary-container: '#464440'
  on-tertiary-container: '#b5b1ac'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c8ecc9'
  primary-fixed-dim: '#adcfae'
  on-primary-fixed: '#03210c'
  on-primary-fixed-variant: '#2f4d34'
  secondary-fixed: '#ffdbcb'
  secondary-fixed-dim: '#ffb693'
  on-secondary-fixed: '#341000'
  on-secondary-fixed-variant: '#733512'
  tertiary-fixed: '#e6e2dc'
  tertiary-fixed-dim: '#cac6c0'
  on-tertiary-fixed: '#1d1b18'
  on-tertiary-fixed-variant: '#494642'
  background: '#fff8f4'
  on-background: '#1f1b17'
  surface-variant: '#eae1da'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
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
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is built for the high-end hospitality sector, specifically tailored for administrators managing premium lodge portfolios. The aesthetic combines the rugged elegance of nature with the precision of modern enterprise software. 

The design style is **Corporate / Modern** with a **Tactile** influence. It avoids the coldness of typical SaaS platforms by incorporating warm, organic tones and soft elevation. The interface should feel grounded, reliable, and premium, evoking the sense of a physical concierge desk. Whitespace is used generously to prevent information density from feeling overwhelming, ensuring a calm user experience for complex operational tasks.

## Colors

The palette is derived from natural landscapes—forest greens, clay earths, and sandstone neutrals. 

- **Primary (Forest Green):** Used for primary actions, active navigation states, and key data indicators. It represents stability and growth.
- **Secondary (Terracotta):** Used for highlights, call-to-actions, and accent metrics to provide a warm contrast to the greens.
- **Neutral (Charcoal/Stone):** A warm grey used for body text and iconography to maintain readability without the harshness of pure black.
- **Background/Tertiary (Sand/Cream):** Replaces standard cool grays for page backgrounds and containers to enhance the high-end, hospitality-focused atmosphere.

## Typography

This design system utilizes **Manrope** for its balance between geometric modernity and organic warmth. The typeface is highly legible in data-heavy environments while maintaining a premium feel.

Headlines use tighter letter spacing and heavier weights to command attention. Body text is set with generous line heights to ensure long-form data reading remains comfortable. Labels for forms and status chips use slightly increased letter spacing and uppercase styling to provide clear visual hierarchy against standard data entries.

## Layout & Spacing

The system uses a **12-column fluid grid** for the main content area, allowing the dashboard to scale across various screen sizes while maintaining structural integrity. 

- **Sidebar:** A fixed width of 260px for the primary navigation.
- **Content Margins:** A minimum of 32px (xl) padding around the main viewport to maintain a "gallery" feel.
- **Rhythm:** An 8px baseline grid is used for all component internal spacing. 
- **Grouping:** Use the `md` (24px) spacing for separating unrelated card sections and `sm` (16px) for elements within a logical group, such as form fields or list items.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

1. **Base Layer:** The canvas uses the Tertiary Sand color (#F4EFE9), creating a warm foundation.
2. **Surface Layer:** Cards and containers are pure white, creating a "lifted" appearance against the off-white background.
3. **Shadows:** We use low-opacity, high-diffusion shadows with a hint of the neutral charcoal color. This avoids a "dirty" look and instead creates a soft, natural depth.
4. **Interactive State:** Hover states on clickable cards should slightly increase shadow spread or provide a subtle 1px border in the primary color to indicate focus.

## Shapes

The shape language is consistently **Rounded**, reflecting the soft edges found in natural materials like polished wood or stone.

- **Standard Components:** Buttons, inputs, and small chips use a 0.5rem (8px) radius.
- **Containers:** Dashboard cards and modals use a larger 1rem (16px) radius to emphasize their role as distinct architectural pieces of the UI.
- **Avatars/Icons:** Generally circular or highly rounded to provide a friendly, human touch to the management interface.

## Components

### Navigation System
The sidebar uses a dark theme (Primary Green background) to contrast against the light content area. Active items feature a subtle terracotta accent bar on the left edge and a semi-transparent white highlight.

### Data Tables
Tables are clean with no vertical borders. Horizontal dividers are thin and use a light neutral tint. Headers are set in `label-sm` (uppercase) for clarity. Rows include a subtle hover state using the Tertiary color.

### Form Fields
Fields utilize a "floating label" or clear top-aligned label approach. The input background is a very light neutral, with a 1px border that thickens and changes to Primary Green upon focus. Error states use the Tertiary Red for both border and helper text.

### Buttons
- **Primary:** Forest Green background with White text.
- **Secondary:** Terracotta background for "Add" or "Create" actions.
- **Ghost:** Transparent background with Neutral text for low-priority actions like "Cancel."

### Status Chips
Used extensively for booking statuses (e.g., "Confirmed", "Checked In", "Pending"). These use low-saturation background tints with high-saturation text of the same hue to ensure legibility without being visually loud.

### Metrics Cards
Key performance indicators (KPIs) feature a large `headline-xl` value, a secondary-colored icon, and a small trend indicator (sparkline or percentage).