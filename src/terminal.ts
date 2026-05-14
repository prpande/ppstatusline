import { openSync } from 'node:fs';
import { WriteStream } from 'node:tty';

// Probes the parent terminal even when stdio is redirected. Claude Code
// pipes JSON to stdin and captures stdout, so `.columns` on the standard
// streams is always undefined; opening CONOUT$ (Windows) or /dev/tty
// (POSIX) gives a handle on the actual controlling terminal.
function probeParentConsole(): number | null {
  // \\.\CONOUT$ is the Win32 device path; the bare name "CONOUT$" gets
  // resolved against the current directory and fails with ENOENT.
  const path = process.platform === 'win32' ? '\\\\.\\CONOUT$' : '/dev/tty';
  try {
    const fd = openSync(path, 'r+');
    const stream = new WriteStream(fd);
    const cols = stream.columns;
    stream.destroy();
    return typeof cols === 'number' && Number.isFinite(cols) && cols > 0 ? cols : null;
  } catch {
    return null;
  }
}

function probeStdioColumns(): number | null {
  const streams = [process.stderr, process.stdout, process.stdin] as Array<{ columns?: number }>;
  for (const s of streams) {
    if (typeof s.columns === 'number' && s.columns > 0) return s.columns;
  }
  return null;
}

function probeEnvColumns(): number | null {
  const env = Number.parseInt(process.env.COLUMNS ?? '', 10);
  return Number.isFinite(env) && env > 0 ? env : null;
}

export function detectColumns(): number {
  return probeParentConsole() ?? probeStdioColumns() ?? probeEnvColumns() ?? 120;
}
