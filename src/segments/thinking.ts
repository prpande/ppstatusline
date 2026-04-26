import type { SegmentRenderer } from '../types.js';

export const thinking: SegmentRenderer = ({ payload, icons }) => {
  if (!payload.thinking?.enabled) return null;
  return icons.thinking;
};
