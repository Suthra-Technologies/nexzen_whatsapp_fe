import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * The app's single breakpoint system. Keep these values in sync with the media queries in
 * src/styles/responsive.css:
 *   mobile  < 768px
 *   tablet  768px – 1023px
 *   desktop >= 1024px
 */
export const BREAKPOINTS = { tabletMin: 768, desktopMin: 1024 } as const;

const MOBILE_QUERY = `(max-width: ${BREAKPOINTS.tabletMin - 1}px)`;
const TABLET_QUERY = `(min-width: ${BREAKPOINTS.tabletMin}px) and (max-width: ${BREAKPOINTS.desktopMin - 1}px)`;

function readBreakpoint(): Breakpoint {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  if (window.matchMedia(MOBILE_QUERY).matches) return 'mobile';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'desktop';
}

/** Current layout breakpoint; re-renders only when the viewport crosses a breakpoint. */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(readBreakpoint);

  useEffect(() => {
    const queries = [window.matchMedia(MOBILE_QUERY), window.matchMedia(TABLET_QUERY)];
    const update = () => setBreakpoint(readBreakpoint());
    queries.forEach(q => q.addEventListener('change', update));
    return () => queries.forEach(q => q.removeEventListener('change', update));
  }, []);

  return breakpoint;
}
