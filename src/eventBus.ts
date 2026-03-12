/**
 * Event bus for Formward internal events (e.g. `localeChanged`).
 *
 * Uses `mitt` for type-safe emit/on/off. Use the global `eventBus` or create isolated buses with `createEventBus()`.
 */
import mitt, { type Emitter } from 'mitt';

/** Map of event names to payload types. Extend for custom events. */
export type FormwardEvents = Record<string, unknown>;

/**
 * Global event bus. Emit and listen for Formward events.
 *
 * @example
 * eventBus.emit('localeChanged');
 * eventBus.on('localeChanged', () => { ... });
 */
export const eventBus: Emitter<FormwardEvents> = mitt<FormwardEvents>();

/**
 * Creates a new mitt-based event bus for isolated usage (e.g. per validator instance).
 *
 * @returns {Emitter<FormwardEvents>} New event bus instance.
 */
export function createEventBus(): Emitter<FormwardEvents> {
  return mitt<FormwardEvents>();
}
