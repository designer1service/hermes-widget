import { useEffect, useRef, useState } from "react";

/**
 * Animated counter — tweens from previous value to next.
 * Mechanical easing per design system guide §5.
 *
 * `currentRef` tracks the live animated value on every frame,
 * so switching tabs in either direction always animates correctly.
 */
export function useCounter(
  target: number,
  format: (n: number) => string = (n) => Math.round(n).toString(),
  duration: number = 400
): string {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any in-flight animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const from = currentRef.current;
    const to = target;

    if (from === to) {
      setDisplay(to);
      return;
    }

    let start: number | null = null;

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 1.5);
      const current = from + (to - from) * eased;
      currentRef.current = current;
      setDisplay(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        currentRef.current = to;
        setDisplay(to);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, duration]);

  return format(display);
}
