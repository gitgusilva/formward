import { reactive } from 'vue';
import { find, isNullOrUndefined, isCallable, values, parseSelector } from '../utils';
import type { FieldError } from '../../types/formward';

/**
 * Creates a reactive array for error items when Vue is available; otherwise a plain array.
 *
 * @returns {Array<FieldError>} Reactive or plain array for error bag items.
 */
function createItemsArray (): FieldError[] {
  try {
    return reactive([]);
  } catch (_) {
    return [];
  }
}

/**
 * Reactive bag of validation errors. Exposed as `this.errors` when using the directive/mixin.
 * Filters by vmId so each component sees only its own errors.
 */
export default class ErrorBag {
  vmId: unknown;
  items: FieldError[];

  constructor (errorBag: ErrorBag | null = null, id: unknown = null) {
    this.vmId = id ?? null;
    // make this bag a mirror of the provided one, sharing the same items reference.
    if (errorBag && errorBag instanceof ErrorBag) {
      this.items = errorBag.items;
    } else {
      this.items = createItemsArray();
    }
  }

  [typeof Symbol === 'function' ? Symbol.iterator : '@@iterator'] () {
    let index = 0;
    return {
      next: () => {
        return { value: this.items[index++], done: index > this.items.length };
      }
    };
  }

  /**
   * Adds one or more errors to the bag.
   *
   * @param {FieldError | FieldError[]} error - Single error or array of errors to add.
   * @returns {void}
   */
  add (error: FieldError | FieldError[]) {
    this.items.push(
      ...this._normalizeError(error)
    );
  }

  /**
   * Normalizes a single error or array of errors into a consistent array, applying scope/vmId.
   *
   * @param {FieldError | FieldError[]} error - Error(s) to normalize.
   * @returns {FieldError[]} Normalized array of errors.
   * @internal
   */
  _normalizeError (error: FieldError | FieldError[]): FieldError[] {
    if (Array.isArray(error)) {
      return error.map(e => {
        e.scope = !isNullOrUndefined(e.scope) ? e.scope : null;
        e.vmId = !isNullOrUndefined(e.vmId) ? e.vmId : (this.vmId || null);

        return e;
      });
    }

    error.scope = !isNullOrUndefined(error.scope) ? error.scope : null;
    error.vmId = !isNullOrUndefined(error.vmId) ? error.vmId : (this.vmId || null);

    return [error];
  }

  /**
   * Regenerates error messages for all items that have a regenerate function (e.g. after locale change).
   *
   * @returns {void}
   */
  regenerate (): void {
    this.items.forEach(i => {
      i.msg = isCallable(i.regenerate) ? i.regenerate() : i.msg;
    });
  }

  /**
   * Updates an existing error by id with partial error data (e.g. scope).
   *
   * @param {string} id - Error id to update.
   * @param {Partial<FieldError>} error - Partial error data to apply.
   * @returns {void}
   */
  update (id: string, error: Partial<FieldError>) {
    const item = find(this.items, (i: FieldError) => i.id === id);
    if (!item) {
      return;
    }

    const idx = this.items.indexOf(item);
    this.items.splice(idx, 1);
    if (error.scope !== undefined) item.scope = error.scope;
    this.items.push(item);
  }

  /**
   * Returns all error messages (optionally filtered by scope).
   * @param {string} [scope]
   * @returns {Array<string>}
   */
  all (scope: string): Array<string> {
    const filterFn = (item) => {
      let matchesScope = true;
      let matchesVM = true;
      if (!isNullOrUndefined(scope)) {
        matchesScope = item.scope === scope;
      }

      if (!isNullOrUndefined(this.vmId)) {
        matchesVM = item.vmId === this.vmId;
      }

      return matchesVM && matchesScope;
    };

    return this.items.filter(filterFn).map(e => e.msg);
  }

  /**
   * Checks if there are any errors (optionally for a scope).
   * @param {string|null} [scope]
   * @returns {boolean}
   */
  any (scope?: string | null): boolean {
    const filterFn = (item: FieldError) => {
      let matchesScope = true;
      let matchesVM = true;
      if (!isNullOrUndefined(scope)) {
        matchesScope = item.scope === scope;
      }

      if (!isNullOrUndefined(this.vmId)) {
        matchesVM = item.vmId === this.vmId;
      }

      return matchesVM && matchesScope;
    };

    return !!this.items.filter(filterFn).length;
  }

  /**
   * Removes all errors, or only those for the given scope.
   * @param {string|null} [scope]
   */
  clear (scope?: string | null) {
    let matchesVM = isNullOrUndefined(this.vmId) ? () => true : (i: FieldError) => i.vmId === this.vmId;
    let matchesScope = (i: FieldError) => i.scope === scope;
    if (arguments.length === 0) {
      matchesScope = () => true;
    } else if (isNullOrUndefined(scope)) {
      scope = null;
    }

    for (let i = 0; i < this.items.length; ++i) {
      if (matchesVM(this.items[i]) && matchesScope(this.items[i])) {
        this.items.splice(i, 1);
        --i;
      }
    }
  }

  /**
   * Collects errors by field (or all). Returns object of field -> messages or array for single field.
   * @param {string} [field] - Field name or selector (e.g. 'name', 'scope.name').
   * @param {string|null} [scope]
   * @param {boolean} [map=true] - If true, return messages; if false, return full error objects.
   * @returns {Object|Array<string>}
   */
  collect (field?: string, scope?: string | null, map: boolean = true) {
    const isSingleField = !isNullOrUndefined(field) && !field.includes('*');
    const groupErrors = (items: FieldError[]) => {
      const errors = items.reduce((collection, error) => {
        if (!isNullOrUndefined(this.vmId) && error.vmId !== this.vmId) {
          return collection;
        }

        if (!collection[error.field]) {
          collection[error.field] = [];
        }

        collection[error.field].push(map ? error.msg : error);

        return collection;
      }, {});

      // reduce the collection to be a single array.
      if (isSingleField) {
        return values(errors)[0] || [];
      }

      return errors;
    };

    if (isNullOrUndefined(field)) {
      return groupErrors(this.items);
    }

    const selector = isNullOrUndefined(scope) ? String(field) : `${scope}.${field}`;
    const { isPrimary, isAlt } = this._makeCandidateFilters(selector);

    const reduced = this.items.reduce<{ primary: FieldError[]; alt: FieldError[] }>(
      (prev, curr) => {
        if (isPrimary(curr)) prev.primary.push(curr);
        if (isAlt(curr)) prev.alt.push(curr);
        return prev;
      },
      { primary: [], alt: [] }
    );

    const collected = reduced.primary.length ? reduced.primary : reduced.alt;
    return groupErrors(collected);
  }

  /**
   * Returns the number of errors (optionally scoped to this bag's vmId).
   *
   * @returns {number} Count of errors.
   */
  count (): number {
    if (this.vmId) {
      return this.items.filter(e => e.vmId === this.vmId).length;
    }

    return this.items.length;
  }

  /**
   * Returns the first error message for the given field id.
   *
   * @param {string} id - Field error id.
   * @returns {string | undefined} Message or undefined if not found.
   */
  firstById (id: string): string | null {
    const error = find(this.items, i => i.id === id);

    return error ? error.msg : undefined;
  }

  /**
   * Gets the first error message for a specific field.
   * @param {string} field - Field name.
   * @param {string|null} [scope=null]
   * @returns {string|undefined}
   */
  first (field: string, scope?: string | null) {
    const selector = isNullOrUndefined(scope) ? field : `${scope}.${field}`;
    const match = this._match(selector);

    return match && match.msg;
  }

  /**
   * Returns the first error rule name for the specified field.
   *
   * @param {string} field - Field name.
   * @param {string} [scope] - Optional scope.
   * @returns {string | null} Rule name or null.
   */
  firstRule (field: string, scope?: string): string | null {
    const errors = this.collect(field, scope, false);

    return (errors.length && errors[0].rule) || undefined;
  }

  /**
   * Checks if there is at least one error for the specified field.
   * @param {string} field - Field name.
   * @param {string|null} [scope=null]
   * @returns {boolean}
   */
  has (field: string, scope?: string | null): boolean {
    return !!this.first(field, scope);
  }

  /**
   * Returns the first error message for a field and rule name.
   *
   * @param {string} name - Field name.
   * @param {string} rule - Rule name.
   * @param {string | null} [scope] - Optional scope.
   * @returns {string | undefined} Message or undefined.
   */
  firstByRule (name: string, rule: string, scope?: string | null) {
    const error = this.collect(name, scope, false).filter(e => e.rule === rule)[0];

    return (error && error.msg) || undefined;
  }

  /**
   * Returns the first error message for a field that does not match the given rule.
   *
   * @param {string} name - Field name.
   * @param {string} [rule='required'] - Rule to exclude.
   * @param {string | null} [scope] - Optional scope.
   * @returns {string | undefined} Message or undefined.
   */
  firstNot (name: string, rule: string = 'required', scope?: string | null) {
    const error = this.collect(name, scope, false).filter(e => e.rule !== rule)[0];

    return (error && error.msg) || undefined;
  }

  /**
   * Removes errors by id or list of ids.
   *
   * @param {string | string[]} id - Single id or array of ids to remove.
   * @returns {void}
   */
  removeById (id: string | string[]) {
    let condition: (item: FieldError) => boolean = (item) => item.id === id;
    if (Array.isArray(id)) {
      condition = (item) => id.indexOf(item.id!) !== -1;
    }

    for (let i = 0; i < this.items.length; ++i) {
      if (condition(this.items[i])) {
        this.items.splice(i, 1);
        --i;
      }
    }
  }

  /**
   * Removes all errors for a field (optionally scoped and/or by vmId).
   *
   * @param {string} field - Field name.
   * @param {string | null} [scope] - Optional scope.
   * @param {*} [vmId] - Optional component id to restrict removal.
   * @returns {void}
   */
  remove (field: string, scope?: string | null, vmId?: unknown) {
    if (isNullOrUndefined(field)) {
      return;
    }

    const selector = isNullOrUndefined(scope) ? String(field) : `${scope}.${field}`;
    const { isPrimary, isAlt } = this._makeCandidateFilters(selector);
    const matches = (item: FieldError) => isPrimary(item) || isAlt(item);
    const shouldRemove = (item: FieldError) => {
      if (isNullOrUndefined(vmId)) return matches(item);

      return matches(item) && item.vmId === vmId;
    };

    for (let i = 0; i < this.items.length; ++i) {
      if (shouldRemove(this.items[i])) {
        this.items.splice(i, 1);
        --i;
      }
    }
  }

  /**
   * Builds primary/alt filter functions for matching errors by selector (field, scope, rule, id).
   *
   * @param {string} selector - Selector string (e.g. 'scope.name', '#id', 'name').
   * @returns {{ isPrimary: (item: FieldError) => boolean; isAlt: (item: FieldError) => boolean }}
   * @internal
   */
  _makeCandidateFilters (selector: string) {
    let matchesRule: (item: FieldError) => boolean = () => true;
    let matchesScope: (item: FieldError) => boolean = () => true;
    let matchesName: (item: FieldError) => boolean = () => true;
    let matchesVM: (item: FieldError) => boolean = () => true;

    const { id, rule, scope, name } = parseSelector(selector);

    if (rule) {
      matchesRule = (item: FieldError) => item.rule === rule;
    }

    if (id) {
      return {
        isPrimary: (item: FieldError) => matchesRule(item) && id === item.id,
        isAlt: () => false
      };
    }

    if (isNullOrUndefined(scope)) {
      matchesScope = (item: FieldError) => isNullOrUndefined(item.scope);
    } else {
      matchesScope = (item: FieldError) => item.scope === scope;
    }

    if (!isNullOrUndefined(name) && name !== '*') {
      matchesName = (item: FieldError) => item.field === name;
    }

    if (!isNullOrUndefined(this.vmId)) {
      matchesVM = (item: FieldError) => item.vmId === this.vmId;
    }

    const isPrimary = (item: FieldError) => {
      return matchesVM(item) && matchesName(item) && matchesRule(item) && matchesScope(item);
    };

    const isAlt = (item: FieldError) => {
      return matchesVM(item) && matchesRule(item) && item.field === `${scope}.${name}`;
    };

    return {
      isPrimary,
      isAlt
    };
  }

  /**
   * Returns the first matching error for the selector (primary or alt match).
   *
   * @param {string} selector - Field selector (e.g. 'scope.name', '#id').
   * @returns {FieldError | undefined} Matching error or undefined.
   * @internal
   */
  _match (selector: string): FieldError | undefined {
    if (isNullOrUndefined(selector)) {
      return undefined;
    }

    const { isPrimary, isAlt } = this._makeCandidateFilters(selector);

    type Acc = { primary?: FieldError; alt?: FieldError };
    const acc = this.items.reduce<Acc>((prev, item) => {
      if (isPrimary(item) && !prev.primary) {
        prev.primary = item;
      }
      if (isAlt(item) && !prev.alt) {
        prev.alt = item;
      }
      return prev;
    }, {});

    return acc.primary ?? acc.alt;
  };
}
