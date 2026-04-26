import type { SegmentRenderer } from '../types.js';

export const rateLimit: SegmentRenderer = ({ payload, config, icons, c }) => {
  const five = payload.rate_limits?.five_hour?.used_percentage;
  const seven = payload.rate_limits?.seven_day?.used_percentage;
  const parts: string[] = [];

  if (typeof five === 'number') {
    parts.push(c.byPercent(five, `${Math.round(five)}%/5h`));
  }
  if (config.showSevenDayLimit && typeof seven === 'number') {
    parts.push(c.byPercent(seven, `${Math.round(seven)}%/7d`));
  }
  if (parts.length === 0) return null;
  return `${icons.rateLimit} ${parts.join(' ')}`;
};
