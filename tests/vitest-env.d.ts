/// <reference types="vitest/globals" />
import type { Vi } from 'vitest';

declare global {
  interface GlobalThis {
    vi: Vi;
  }
}

export {};
