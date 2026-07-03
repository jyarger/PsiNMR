import type { ComponentProps } from 'react';
import { useEffect, useRef } from 'react';
import { CanvasMoleculeEditor } from 'react-ocl';

type Props = ComponentProps<typeof CanvasMoleculeEditor>;

/**
 * CanvasMoleculeEditor renders its drawing canvas inside a shadow root,
 * out of reach of the app stylesheets. This wrapper injects a small style
 * into that shadow root so the canvas follows the PsiNMR theme: the
 * filter value comes from the `--psi-mol-editor-filter` custom property
 * (custom properties inherit across shadow boundaries), which theme.css
 * sets to an invert/hue-rotate in dark mode and `none` in light mode.
 */
export function ThemedCanvasMoleculeEditor(props: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function injectThemeStyle() {
      for (const element of wrapper?.querySelectorAll('div') ?? []) {
        const root = element.shadowRoot;
        if (!root || root.querySelector('style[data-psi-theme-style]')) {
          continue;
        }
        const style = document.createElement('style');
        style.dataset.psiThemeStyle = 'true';
        style.textContent =
          'canvas { filter: var(--psi-mol-editor-filter, none); }';
        root.append(style);
      }
    }

    // The editor mounts its shadow DOM asynchronously.
    injectThemeStyle();
    const observer = new MutationObserver(injectThemeStyle);
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ display: 'contents' }}>
      <CanvasMoleculeEditor {...props} />
    </div>
  );
}
