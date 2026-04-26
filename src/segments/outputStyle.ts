import type { SegmentRenderer } from '../types.js';

export const outputStyle: SegmentRenderer = ({ payload, icons }) => {
  const name = payload.output_style?.name;
  if (!name || name === 'default') return null;
  return `${icons.outputStyle} ${name}`;
};
