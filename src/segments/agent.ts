import type { SegmentRenderer } from '../types.js';

export const agent: SegmentRenderer = ({ payload, icons }) => {
  const name = payload.agent?.name;
  if (!name) return null;
  return `${icons.agent} ${name}`;
};
