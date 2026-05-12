// Design system — calm fintech aesthetic
// Muted slate palette, single accent, line icons

export const tokens = {
  // Surfaces
  bg: '#f8fafc',          // page background
  surface: '#ffffff',     // card background
  surfaceMuted: '#f1f5f9', // hover / subtle background

  // Text
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  textInverse: '#ffffff',

  // Borders
  border: '#e2e8f0',
  borderMuted: '#f1f5f9',

  // Accent (single primary)
  accent: '#1e40af',         // deep professional blue
  accentLight: '#dbeafe',
  accentMuted: '#eff6ff',

  // Status (used sparingly)
  positive: '#0d9488',       // muted teal
  positiveLight: '#ccfbf1',
  negative: '#b91c1c',       // muted red
  negativeLight: '#fee2e2',
  warning: '#a16207',
  warningLight: '#fef3c7',

  // Palette for avatars / parent colors (muted, professional)
  avatarColors: ['#1e40af', '#0d9488', '#a16207', '#b91c1c', '#7c3aed', '#475569'],

  // Radii
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '16px',
  radiusXl: '20px',
  radiusFull: '999px',

  // Spacing (4pt scale)
  s1: '4px', s2: '8px', s3: '12px', s4: '16px',
  s5: '20px', s6: '24px', s8: '32px', s10: '40px',

  // Shadows (very subtle)
  shadow1: '0 1px 2px rgba(15, 23, 42, 0.04)',
  shadow2: '0 1px 3px rgba(15, 23, 42, 0.06)',
}

// Convenience: card style
export const cardStyle: React.CSSProperties = {
  background: tokens.surface,
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radiusLg,
  boxShadow: tokens.shadow1,
}
