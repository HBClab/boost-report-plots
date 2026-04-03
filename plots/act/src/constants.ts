// Color palette from docs/plot-specs/act.md (v2.1)
export const COLORS = {
  sleep: '#4A5568',
  sedentary: '#6B7890',
  light: '#8CC299',
  moderate: '#FCBA42',
  vigorous: '#DE4545',
  intervention: '#247F8F',
  observational: '#DE7833',
  missing: '#E0E0E8',
  background: '#F7F7F9',
  card: '#FFFFFF',
  textPrimary: '#212130',
  textSecondary: '#737380',
} as const;

// Segment order for Plot 1 (left → right: dark/cool to warm)
export const SEGMENTS = ['sleep', 'sed', 'light', 'mod', 'vig'] as const;
export type Segment = typeof SEGMENTS[number];

// Map segment keys to display labels
export const SEGMENT_LABELS: Record<Segment, string> = {
  sleep: 'Sleep',
  sed: 'Sedentary',
  light: 'Light',
  mod: 'Moderate',
  vig: 'Vigorous',
};

// Map segment keys to colors
export const SEGMENT_COLORS: Record<Segment, string> = {
  sleep: COLORS.sleep,
  sed: COLORS.sedentary,
  light: COLORS.light,
  mod: COLORS.moderate,
  vig: COLORS.vigorous,
};
