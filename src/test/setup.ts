import '@testing-library/jest-dom';

// pdfjs-dist uses DOMMatrix which is not available in jsdom.
// Provide a minimal stub so imports do not throw at module-load time.
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error jsdom stub
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { return this; }
    static fromMatrix() { return new globalThis.DOMMatrix(); }
  };
}

// Suppress noisy MUI console warnings in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('Warning:')) return;
  originalConsoleError(...args);
};
