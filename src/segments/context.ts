import type { SegmentRenderer } from '../types.js';

export const context: SegmentRenderer = ({ payload, config, icons, c }) => {
  const pctRaw = payload.context_window?.used_percentage;
  if (typeof pctRaw !== 'number' || !Number.isFinite(pctRaw)) {
    return null;
  }
  const pct = Math.max(0, Math.min(100, pctRaw));
  const width = Math.max(0, Math.floor(config.contextBarWidth));
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  const empty = Math.max(0, width - filled);
  const filledStr = c.byPercent(pct, '█'.repeat(filled));
  const emptyStr = c.dim('-'.repeat(empty));
  return `${icons.context} ${filledStr}${emptyStr} ${Math.round(pct)}%`;
};
