import type { SegmentRenderer } from '../types.js';

export const pr: SegmentRenderer = ({ pr: prInfo, icons, c }) => {
  if (!prInfo) return null;
  const label = `${icons.pr} #${prInfo.number}`;
  const colored =
    prInfo.state === 'OPEN_PASSING'
      ? c.green(label)
      : prInfo.state === 'OPEN_PENDING_OR_FAILING'
        ? c.yellow(label)
        : c.dim(label);
  return c.link(colored, prInfo.url);
};
