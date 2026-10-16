export type TickerItem = { text: string; url: string };
export type SkillItem = { label: string; value: number; color: string };
export type DualButtonData = {
  leftText: string;
  leftUrl: string;
  rightText: string;
  rightUrl: string;
  divider: string;
  align: 'left' | 'center' | 'right';
  leftStyle: string;
  rightStyle: string;
};
export type QuoteCard = {
  quote: string;
  name: string;
  role: string;
  imageUrl: string;
  rating: number;
  emphasis: boolean;
  cardColor: string;
};

function asRecord(row: unknown): Record<string, unknown> {
  return row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function readTickerItems(data: Record<string, unknown>): TickerItem[] {
  const raw = Array.isArray(data.items) ? data.items : [];
  const items = raw.map((row) => {
    const o = asRecord(row);
    return { text: String(o.text ?? '').trim(), url: String(o.url ?? '').trim() };
  });
  const filled = items.filter((item) => item.text);
  return filled.length ? filled : [{ text: 'Latest update', url: '' }];
}

export function tickerSpeed(data: Record<string, unknown>): number {
  return clamp(Number(data.speed), 8, 90, 28);
}

export function readSkillItems(data: Record<string, unknown>): SkillItem[] {
  const raw = Array.isArray(data.items) ? data.items : [];
  const items = raw.map((row) => {
    const o = asRecord(row);
    return {
      label: String(o.label ?? '').trim() || 'Skill',
      value: clamp(Number(o.value), 0, 100, 70),
      color: String(o.color ?? '').trim() || '#7c3aed',
    };
  });
  return items.length
    ? items
    : [
        { label: 'HTML / CSS', value: 90, color: '#7c3aed' },
        { label: 'Design', value: 66, color: '#7c3aed' },
      ];
}

export function readDualButton(data: Record<string, unknown>): DualButtonData {
  const align = data.align === 'left' || data.align === 'right' ? data.align : 'center';
  return {
    leftText: String(data.leftText ?? 'Download free').trim() || 'Download free',
    leftUrl: String(data.leftUrl ?? '#').trim() || '#',
    rightText: String(data.rightText ?? 'Purchase').trim() || 'Purchase',
    rightUrl: String(data.rightUrl ?? '#').trim() || '#',
    divider: String(data.divider ?? 'OR').trim(),
    align,
    leftStyle: String(data.leftStyle ?? 'outline').trim() || 'outline',
    rightStyle: String(data.rightStyle ?? 'primary').trim() || 'primary',
  };
}

export function readQuoteCards(data: Record<string, unknown>, fallbackQuote = ''): QuoteCard[] {
  const raw = Array.isArray(data.items) ? data.items : [];
  const fromList = raw.map((row) => {
    const o = asRecord(row);
    return {
      quote: String(o.quote ?? '').trim(),
      name: String(o.name ?? '').trim(),
      role: String(o.role ?? '').trim(),
      imageUrl: String(o.imageUrl ?? '').trim(),
      rating: clamp(Number(o.rating), 0, 5, 5),
      emphasis: Boolean(o.emphasis),
      cardColor: String(o.cardColor ?? '').trim(),
    };
  });
  const filled = fromList.filter((item) => item.quote || item.name);
  if (filled.length) return filled;
  const quote = String(data.quote ?? fallbackQuote).trim();
  const name = String(data.name ?? '').trim();
  if (!quote && !name) {
    return [
      {
        quote: 'A clear, honest take from someone who used the work.',
        name: 'Name',
        role: 'Role',
        imageUrl: '',
        rating: 5,
        emphasis: false,
        cardColor: '',
      },
    ];
  }
  return [
    {
      quote,
      name,
      role: String(data.role ?? '').trim(),
      imageUrl: String(data.imageUrl ?? '').trim(),
      rating: clamp(Number(data.rating), 0, 5, 5),
      emphasis: false,
      cardColor: '',
    },
  ];
}

export function quoteColumns(data: Record<string, unknown>, count: number): number {
  return clamp(Number(data.columns) || (count >= 3 ? 3 : count >= 2 ? 2 : 1), 1, 4, Math.min(3, Math.max(1, count)));
}
