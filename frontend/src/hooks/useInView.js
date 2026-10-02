/**
 * useInView — Intersection Observer hook for scroll-triggered animations.
 *
 * Returns a ref callback and a boolean `inView` that becomes true once
 * the element is visible in the viewport past the threshold (default 30%).
 * Supports both array `[ref, inView]` and object `{ ref, inView }` destructuring.
 * Supports both numeric threshold `useInView(0.3)` and options `useInView({ threshold: 0.3 })`.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useInView(options = 0.3) {
  const threshold = typeof options === 'number' ? options : (options?.threshold ?? 0.3);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);
  const observerRef = useRef(null);

  const setRef = useCallback((node) => {
    // Disconnect old observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node && !inView) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            // Once visible, stop observing (one-shot)
            observerRef.current?.disconnect();
          }
        },
        { threshold }
      );
      observerRef.current.observe(node);
    }

    ref.current = node;
  }, [threshold, inView]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const result = [setRef, inView];
  result.ref = setRef;
  result.inView = inView;
  return result;
}
