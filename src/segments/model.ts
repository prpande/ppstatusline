import type { SegmentRenderer } from '../types.js';

export const model: SegmentRenderer = ({ payload, icons }) => {
  const name = payload.model?.display_name;
  if (!name) return null;
  return `${icons.model} ${name}`;
};
