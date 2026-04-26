import type { SegmentRenderer } from '../types.js';

export const context: SegmentRenderer = ({ payload, config, icons, c }) => {
  const pctRaw = payload.context_window?.used_percentage;
  const pct = typeof pctRaw === 'number' ? Math.max(0, Math.min(100, pctRaw)) : 0;
  const width = config.contextBarWidth;
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const filledStr = c.byPercent(pct, '█'.repeat(filled));
  const emptyStr = c.dim('-'.repeat(empty));
  return `${icons.context} ${filledStr}${emptyStr} ${Math.round(pct)}%`;
};
