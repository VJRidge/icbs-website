/** Shared chart colors — indigo accent to match analytics mockups. */

export const CHART = {
  navy: '#4F46E5',
  navySoft: '#A5B4FC',
  gold: '#C9A227',
  teal: '#0F766E',
  coral: '#B45309',
  slate: '#94A3B8',
  grid: '#E2E8F0',
  label: '#64748B',
  pie: ['#4F46E5', '#818CF8', '#C4B5FD', '#0F766E', '#C9A227', '#64748B', '#B45309', '#134E4A'],
} as const;

export function shortLabel(label: string, max = 22): string {
  const t = label.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
