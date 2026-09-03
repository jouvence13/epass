---
name: Academic Transit System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#43474f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#2b1b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#472f00'
  on-tertiary-container: '#ce9000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#88d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#ffdeac'
  tertiary-fixed-dim: '#ffba38'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
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
  headline-sm:
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
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-code:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  gutter: 12px
---

## Brand & Style
The design system for the University of Abomey-Calavi (CROUS-UAC) balances institutional prestige with modern digital efficiency. The brand personality is **Reliable, Technical, and Accessible**. It must bridge the gap between a formal academic environment and the fast-paced, mobile-first nature of urban transit.

The design style is **Corporate / Modern** with a focus on high-utility components. It utilizes a structured grid, clear visual metaphors, and a "SaaS-lite" aesthetic that prioritizes clarity over ornamentation. The UI must remain performant on a wide range of mobile devices while ensuring high legibility for outdoor use under bright West African sunlight.

## Colors
The palette is anchored by **Academic Blue** (#003366), evoking trust and institutional stability. **Safety Green** (#2E7D32) is used exclusively for functional success states, ticket validation, and active bus status. **Action Gold** (#FFB300) serves as the primary call-to-action color to ensure high visibility against the deep blue.

- **Backgrounds:** Use clean whites (#FFFFFF) and light grays (#F8F9FA) for the main interface to maintain a fresh, modern feel.
- **Contrast:** Ensure all text-on-background combinations meet WCAG AA standards for outdoor legibility.
- **Branding Integration:** Specific slots are reserved for MTN Yellow and Moov Blue for Mobile Money transactions to provide immediate recognition of payment providers.

## Typography
This design system utilizes **Inter** for its exceptional legibility and neutral, systematic tone. 

- **Hierarchy:** Large display titles are reserved for ticket balances and bus numbers.
- **Readability:** Body text should never drop below 14px to accommodate diverse users in high-glare environments.
- **Functional Type:** A specific `status-code` style is used for alphanumeric ticket codes or bus identifiers, ensuring characters are distinct and easy to read quickly by drivers.

## Layout & Spacing
The system uses a **Fluid Grid** for mobile and a **Fixed Grid** (max-width: 1200px) for administrative desktop views.

- **Mobile Rhythm:** A 4-column grid with 16px side margins. Elements are typically stacked vertically to facilitate one-handed use during transit.
- **Touch Targets:** All interactive elements (buttons, toggles, list items) must maintain a minimum height of 48px to satisfy accessibility requirements.
- **Visual Breathing Room:** Generous use of `lg` (24px) spacing between distinct functional sections (e.g., separating the QR code from the transaction history).

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Subtle Shadows**. 

1. **Surface (Level 0):** The primary background #F8F9FA.
2. **Container (Level 1):** White cards (#FFFFFF) with a very soft, diffused shadow (0px 2px 8px rgba(0,0,0,0.05)) for content grouping.
3. **Floating (Level 2):** Critical elements like "Show QR Code" or "Validate" buttons use a more pronounced shadow (0px 4px 12px rgba(0,0,0,0.12)) to appear closer to the user.
4. **Overlay (Level 3):** Modal sheets for payment confirmation or route details.

## Shapes
The shape language is **Rounded**, using an 8px base radius (`0.5rem`) for standard components. This creates a friendly and approachable feel while remaining professional.

- **Standard Buttons/Inputs:** 8px (rounded).
- **Cards/Containers:** 12px (rounded-lg) to soften the layout of data-heavy screens.
- **Status Badges:** Fully pill-shaped (rounded-xl) to distinguish them from interactive buttons.

## Components

### 1. Mobile Money Integration
- **Payment Selector:** Large 64px height rows featuring the service provider logo (MTN/Moov), the account name, and a radio selector.
- **Processing State:** A full-screen overlay with a Safety Green progress bar and a "Waiting for SMS verification" status label.

### 2. QR Code Display
- **Container:** High-contrast white card with 16px internal padding. The QR code itself should be rendered at a minimum of 200x200px.
- **Validator:** A live-ticking clock or animated "Security Pulse" around the QR code to prevent screenshots from being used as valid tickets.

### 3. Status Indicators & Badges
- **KYC Verification:**
    - *Verified:* Safety Green pill with a checkmark icon.
    - *Pending:* Action Gold pill with an "info" icon.
    - *Rejected:* Error Red pill with an "X" icon.
- **Real-time Tracking:** Bus icons on maps should include a directional arrow and a pulsing "Live" dot when the data is less than 30 seconds old.

### 4. Buttons & Inputs
- **Primary Button:** Academic Blue background with white text for standard actions.
- **Secondary/Highlight Button:** Action Gold background with deep blue text for critical "Buy/Pay" actions.
- **Input Fields:** 1px gray border (#DEE2E6) that thickens and changes to Academic Blue on focus. Labels are always visible above the field (not floating) for maximum clarity.

### 5. Fleet Management Lists
- **Bus Rows:** Condensed 56px rows for admin views showing: [Bus Number] - [Route] - [Occupancy %] - [Status Badge]. Use high-contrast dividers between rows.