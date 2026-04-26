import type { ColorUtils } from './types.js';

const ESC = '\x1b';

const codes = {
  reset: `${ESC}[0m`,
  dim: `${ESC}[2m`,
  green: `${ESC}[32m`,
  yellow: `${ESC}[33m`,
  red: `${ESC}[31m`,
  gitOrange: `${ESC}[38;2;240;81;51m`,   // truecolor #F05133
};

function wrap(code: string, reset: string, enabled: boolean) {
  return (s: string) => (enabled ? `${code}${s}${reset}` : s);
}

export function makeColors(enabled: boolean): ColorUtils {
  const reset = enabled ? codes.reset : '';
  return {
    enabled,
    reset,
    dim: wrap(codes.dim, reset, enabled),
    green: wrap(codes.green, reset, enabled),
    yellow: wrap(codes.yellow, reset, enabled),
    red: wrap(codes.red, reset, enabled),
    gitOrange: wrap(codes.gitOrange, reset, enabled),
    byPercent: (pct, s) => {
      if (!enabled) return s;
      if (pct >= 90) return `${codes.red}${s}${reset}`;
      if (pct >= 70) return `${codes.yellow}${s}${reset}`;
      return `${codes.green}${s}${reset}`;
    },
    link: (text, url) => {
      if (!enabled) return text;
      // OSC 8 hyperlink: ESC ] 8 ; ; URL ST text ESC ] 8 ; ; ST
      const ST = `${ESC}\\`;
      return `${ESC}]8;;${url}${ST}${text}${ESC}]8;;${ST}`;
    },
  };
}
