import type { SegmentRenderer } from '../types.js';

export const sessionName: SegmentRenderer = ({ payload, icons }) => {
  const name = payload.session_name;
  if (!name) return null;
  return `${icons.sessionName} ${name}`;
};
