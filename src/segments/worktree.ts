import type { SegmentRenderer } from '../types.js';

export const worktree: SegmentRenderer = ({ payload, icons }) => {
  const name = payload.workspace?.git_worktree;
  if (!name) return null;
  return `${icons.worktree} ${name}`;
};
