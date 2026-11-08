import { cubicOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";

export function menuTransition(node: HTMLElement): TransitionConfig {
  const reduceMotion = node.ownerDocument.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    duration: reduceMotion ? 0 : 300,
    easing: cubicOut,
    // Reveal the panel without changing the bounds used to position it.
    css: (t) => `
      clip-path: inset(-32px -32px calc(${(1 - t) * 100}% - ${32 * t}px) -32px);
      opacity: ${t};
    `,
  };
}
