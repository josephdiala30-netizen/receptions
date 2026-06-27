---
name: Executive Path
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#001815'
  on-tertiary: '#ffffff'
  tertiary-container: '#002f2a'
  on-tertiary-container: '#28a094'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for the modern corporate traveler, prioritizing efficiency, clarity, and a sense of calm amidst the complexities of business logistics. The brand personality is professional and dependable, yet forward-thinking. 

The aesthetic follows a **Modern Corporate** approach with **Minimalist** leanings. It leverages significant whitespace to reduce cognitive load, high-quality functional typography for quick data scanning, and a restrained use of color to highlight critical path actions. The emotional response should be one of "controlled precision"—giving the user confidence that their itinerary is organized and accessible.

## Colors
The palette is rooted in a foundation of "Slate" and "Midnight" blues to establish authority and stability. 

- **Primary & Secondary:** Used for structural elements, navigation, and high-level headers.
- **Tertiary (Teal):** The primary action color, used for "Book Now," "Confirm," and primary CTA buttons.
- **Status Indicators:** A dedicated semantic set for immediate visual feedback on trip states:
    - **Pending:** Amber, suggesting caution or "action required."
    - **Confirmed:** Emerald, signaling completion and safety.
    - **Cancelled:** Rose, indicating a break in the schedule.
- **Backgrounds:** Use a very light grey (#F8FAFC) to separate the canvas from white content cards.

## Typography
This design system utilizes **Inter** exclusively to ensure maximum legibility across various pixel densities. 

The hierarchy is strictly enforced:
- **Headlines:** Use tighter letter spacing and heavier weights to create strong visual anchors.
- **Body:** Standardized at 16px for primary reading and 14px for secondary metadata.
- **Labels:** Used for small identifiers like "FLIGHT NUMBER" or "GATE," often paired with a medium weight and slight uppercase styling for distinction.
- **Mobile scaling:** Display and large headlines drop significantly in size to ensure itineraries remain readable without excessive horizontal scrolling.

## Layout & Spacing
The system employs an **8px linear scale** for all spatial relationships. 

- **Desktop:** A 12-column fixed grid centered on the page. Use a 24px gutter to provide breathing room between itinerary modules.
- **Mobile:** A single-column fluid layout with 16px side margins. 
- **Rhythm:** Use "Stack" spacing for vertical flow. `stack-md` (12px) is the default for elements within a card (e.g., Time to Destination). `stack-lg` (24px) is used to separate distinct trip segments.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Ambient Shadows**. This keeps the interface feeling light and responsive.

1.  **Level 0 (Base):** The main background color (#F8FAFC).
2.  **Level 1 (Cards):** Pure white (#FFFFFF) surfaces with a subtle 1px border (#E2E8F0) and a very soft, diffused shadow (0px 4px 6px -1px rgba(0, 0, 0, 0.05)).
3.  **Level 2 (Modals/Overlays):** Elevated with a more pronounced shadow to indicate temporary interaction and focus.

Avoid heavy dark shadows; the goal is to make cards appear as if they are resting lightly on the surface, not floating high above it.

## Shapes
The shape language is consistently **Rounded** to soften the professional aesthetic and make the app feel more accessible.

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px).
- **Large Elements (Cards, Modals):** 1rem (16px).
- **Status Badges/Chips:** 1.5rem (24px) to create a pill-shaped effect that distinguishes them from actionable buttons.

## Components
- **Buttons:** 
    - *Primary:* Solid Teal (#0D9488) with white text.
    - *Secondary:* Light Slate background with Dark Slate text.
- **Status Chips:** Small badges with a low-opacity background of the status color and high-opacity text (e.g., Confirmed has a light green background and dark green text).
- **Itinerary Cards:** The core component. Includes a left-hand border accent matching the status color, a title for the event, and a 2-column metadata section for time and location.
- **Input Fields:** 1px Slate-200 border, turning Teal-600 on focus. Labels sit directly above the field in `label-md` style.
- **Timeline Indicator:** A vertical 2px line connecting itinerary cards to visually represent the chronological flow of the business trip.