import Field from './field';
import { find, createError } from '../utils';

/**
 * Collection of Field instances with lookup by id and matcher-based find/filter/remove.
 */
export default class FieldBag {
  items: Field[];
  itemsById: Record<string, Field>;

  /**
   * Creates a field bag, optionally from an existing array (and builds itemsById index).
   *
   * @param {Field[]} [items=[]] - Initial fields.
   */
  constructor (items: Field[] = []) {
    this.items = items || [];
    this.itemsById = this.items.reduce<Record<string, Field>>((itemsById, item) => {
      itemsById[item.id] = item;
      return itemsById;
    }, {});
  }

  [typeof Symbol === 'function' ? Symbol.iterator : '@@iterator'] () {
    let index = 0;
    return {
      next: () => {
        return { value: this.items[index++], done: index > this.items.length };
      }
    };
  }

  /** Number of fields in the bag. */
  get length (): number {
    return this.items.length;
  }

  /**
   * Finds the first field that matches the matcher (name, scope, id, vmId).
   *
   * @param {object} matcher - FieldMatchOptions.
   * @returns {Field | null | undefined}
   */
  find (matcher: object): Field | null | undefined {
    return find(this.items, (item: Field) => item.matches(matcher as any));
  }

  /**
   * Finds a field by id.
   *
   * @param {string} id - Field id.
   * @returns {Field | null | undefined}
   */
  findById (id: string): Field | null | undefined {
    return this.itemsById[id] || null;
  }

  /**
   * Returns fields that match any of the matchers (if array) or the single matcher.
   *
   * @param {object | any[]} matcher - Single matcher or array of matchers.
   * @returns {Field[]}
   */
  filter (matcher: object | any[]): Field[] {
    // multiple matchers to be tried.
    if (Array.isArray(matcher)) {
      return this.items.filter(item => matcher.some(m => item.matches(m)));
    }

    return this.items.filter(item => item.matches(matcher));
  }

  /**
   * Maps each field with the provided function.
   *
   * @param {(f: Field) => any} mapper - Map function.
   * @returns {any[]}
   */
  map (mapper: (f: Field) => any): any[] {
    return this.items.map(mapper);
  }

  /**
   * Removes the first matching field (or the given Field) and returns it.
   *
   * @param {object | Field} matcher - Matcher or Field instance.
   * @returns {Field | null} Removed field or null.
   */
  remove (matcher: object | Field): Field | null {
    let item: Field | null = null;
    if (matcher instanceof Field) {
      item = matcher;
    } else {
      item = this.find(matcher);
    }

    if (!item) return null;

    const index = this.items.indexOf(item);
    this.items.splice(index, 1);
    delete this.itemsById[item.id];

    return item;
  }

  /**
   * Appends a field to the bag (validates type and id uniqueness).
   *
   * @param {Field | null | undefined} item - Field to add.
   * @throws {Error} If not a Field, missing id, or duplicate id.
   */
  push (item: Field | null | undefined) {
    if (!(item instanceof Field)) {
      throw createError('FieldBag only accepts instances of Field that has an id defined.');
    }

    if (!item.id) {
      throw createError('Field id must be defined.');
    }

    if (this.findById(item.id)) {
      throw createError(`Field with id ${item.id} is already added.`);
    }

    this.items.push(item);
    this.itemsById[item.id] = item;
  }
}
