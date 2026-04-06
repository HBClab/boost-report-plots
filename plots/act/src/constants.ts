// Color palette — dark scientific theme
export const COLORS = {
  sleep: '#4E5C7A',
  sedentary: '#7A93B8',
  light: '#3FA873',
  moderate: '#F5A623',
  vigorous: '#EF4444',
  intervention: '#22C4D4',
  observational: '#FB923C',
  missing: '#1E2A3F',
  background: '#0D1117',
  card: '#131C2E',
  textPrimary: '#DDE4EF',
  textSecondary: '#6B7A90',
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
