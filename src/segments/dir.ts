import type { SegmentRenderer } from '../types.js';

export const dir: SegmentRenderer = ({ payload, icons }) => {
  const path = payload.workspace?.current_dir ?? payload.cwd;
  if (!path) return null;
  return `${icons.dir} ${path}`;
};
