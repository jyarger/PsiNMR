import { useRef } from 'react';

/**
 * Minimal touch-gesture helpers for the mobile view (`#/m`). Pinch-zoom and
 * two-finger pan are handled by the viewer's own pointer/d3 layer once the
 * container opts out of browser gestures (`touch-action: none`); this hook adds
 * the one gesture that isn't native to it — double-tap to reset the view.
 */
export function useDoubleTap(onDoubleTap: () => void, delayMs = 300) {
  const lastTap = useRef(0);
  const lastX = useRef(0);
  const lastY = useRef(0);

  return (event: React.TouchEvent) => {
    // Only single-finger taps count; multi-touch is pinch/pan for the viewer.
    if (event.touches.length > 0 || event.changedTouches.length !== 1) {
      lastTap.current = 0;
      return;
    }
    const touch = event.changedTouches[0];
    const now = Date.now();
    const movedFar =
      Math.abs(touch.clientX - lastX.current) > 24 ||
      Math.abs(touch.clientY - lastY.current) > 24;

    if (now - lastTap.current < delayMs && !movedFar) {
      onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      lastX.current = touch.clientX;
      lastY.current = touch.clientY;
    }
  };
}
