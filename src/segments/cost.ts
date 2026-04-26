import type { SegmentRenderer } from '../types.js';

export const cost: SegmentRenderer = ({ payload, icons, c }) => {
  const usd = payload.cost?.total_cost_usd;
  if (typeof usd !== 'number') return null;
  return c.yellow(`${icons.cost} $${usd.toFixed(4)}`);
};
