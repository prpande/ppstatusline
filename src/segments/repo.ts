import { basename } from 'node:path';
import type { SegmentRenderer } from '../types.js';

export const repo: SegmentRenderer = ({ git, payload, icons, c }) => {
  if (!git) return null;
  const cwd = payload.workspace?.current_dir ?? payload.cwd ?? '';
  const display = git.repo ?? (cwd ? basename(cwd) : '');
  if (!display) return null;
  return `${c.gitOrange(icons.repo)} ${display}`;
};
