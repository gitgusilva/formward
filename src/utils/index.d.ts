/**
 * Type declarations for utils (implementation is Flow-typed .js).
 * Allows TS files to import from './utils' without tsc parsing the Flow .js.
 */
declare const assign: (target: object, ...sources: unknown[]) => object;
declare const getPath: (path: string, target: unknown, def?: unknown) => unknown;

export {
  assign,
  getPath,
};
export const isTextInput: (el: HTMLInputElement) => boolean;
export const isCheckboxOrRadioInput: (el: HTMLInputElement) => boolean;
export const isDateInput: (el: HTMLInputElement) => boolean;
export const getDataAttribute: (el: HTMLElement, name: string) => string | null;
export const setDataAttribute: (el: HTMLElement, name: string, value: string) => void;
export const isNullOrUndefined: (...values: unknown[]) => boolean;
export const isCallable: (fn: unknown) => boolean;
export const normalizeRules: (rules: string | Record<string, unknown>) => Record<string, unknown>;
export const warn: (message: string) => void;
export const isObject: (obj: unknown) => boolean;
export const find: (arr: unknown[] | { length: number }, predicate: (x: unknown) => boolean) => unknown;
export const values: (obj: object) => unknown[];
export const parseSelector: (selector: string) => { name: string; scope: string | null };
export const toArray: (arrayLike: { length: number }) => unknown[];
export const merge: (target: object, source: object) => object;
export const uniqId: () => string;
export const includes: (collection: string | unknown[], item: unknown) => boolean;
