import type { SegmentRenderer } from '../types.js';

export const branch: SegmentRenderer = ({ git, icons, c }) => {
  if (!git) return null;
  const markers: string[] = [];
  if (git.dirty) markers.push('✱');
  if (git.ahead > 0) markers.push(`↑${git.ahead}`);
  if (git.behind > 0) markers.push(`↓${git.behind}`);
  const tail = markers.length ? ` ${c.dim(markers.join(' '))}` : '';
  return `${icons.branch} ${git.branch}${tail}`;
};
