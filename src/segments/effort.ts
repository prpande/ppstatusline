import type { SegmentRenderer } from '../types.js';

export const effort: SegmentRenderer = ({ payload, icons, c }) => {
  const level = payload.effort?.level;
  if (!level) return null;
  const text = `${icons.effort} ${level}`;
  if (level === 'xhigh' || level === 'max') return c.red(text);
  if (level === 'high') return c.yellow(text);
  return text;
};
