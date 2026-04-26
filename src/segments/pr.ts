import type { SegmentRenderer } from '../types.js';

export const pr: SegmentRenderer = ({ pr: prInfo, icons, c }) => {
  if (!prInfo) return null;
  if (prInfo.state === 'CLOSED_OR_MERGED') return null;
  const label = `${icons.pr} #${prInfo.number}`;
  const colored =
    prInfo.state === 'OPEN_PASSING' ? c.green(label) : c.yellow(label);
  return c.link(colored, prInfo.url);
};
