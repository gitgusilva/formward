/**
 * Vitest setup — runs before each test file.
 * Exposes vi globally so tests can use vi.fn(), vi.spyOn() without importing.
 */
import { vi } from 'vitest';

(globalThis as unknown as { vi: typeof vi }).vi = vi;
