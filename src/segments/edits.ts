import type { SegmentRenderer } from '../types.js';

export const edits: SegmentRenderer = ({ payload, icons, c }) => {
  const added = payload.cost?.total_lines_added;
  const removed = payload.cost?.total_lines_removed;
  if (typeof added !== 'number' && typeof removed !== 'number') return null;
  const a = added ?? 0;
  const r = removed ?? 0;
  return `${icons.edits} ${c.green(`+${a}`)} ${c.red(`-${r}`)}`;
};
