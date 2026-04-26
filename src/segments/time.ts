import type { SegmentRenderer } from '../types.js';

function fmt(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${Math.round(ms / 1000)}s`;
}

export const time: SegmentRenderer = ({ payload, icons, c }) => {
  const wall = payload.cost?.total_duration_ms;
  const api = payload.cost?.total_api_duration_ms;
  if (typeof wall !== 'number') return null;
  const wallStr = fmt(wall);
  const apiStr = typeof api === 'number' ? ` ${c.dim('│ api')} ${fmt(api)}` : '';
  return `${icons.time} ${wallStr}${apiStr}`;
};
