import type { SegmentRenderer } from '../types.js';

export const vimMode: SegmentRenderer = ({ payload, icons }) => {
  const mode = payload.vim?.mode;
  if (!mode) return null;
  return `${icons.vimMode} ${mode}`;
};
