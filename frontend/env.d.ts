/// <reference types="vite/client" />

// Minimal JSX fallback to avoid "JSX.IntrinsicElements" errors
// Install `@types/react` to get full JSX typings.
declare global {
  namespace JSX {
    // autoriser n'importe quel element intrinseque (fallback temporaire)
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {}
