import { validate } from '@/rules/one_of';

test('validates that the value is one of the allowed values', () => {
  const list = [1, 2, 3, 'a', 'b'];

  list.forEach((value) => expect(validate(value, list)).toBe(true));
  expect(validate([1, 2], list)).toBe(true);

  expect(validate(0, list)).toBe(false);
  expect(validate(4, list)).toBe(false);
  expect(validate('c', list)).toBe(false);
  expect(validate([4], list)).toBe(false);
});

test('validates with array of strings', () => {
  const list = ['red', 'green', 'blue'];
  expect(validate('red', list)).toBe(true);
  expect(validate('yellow', list)).toBe(false);
});

test('returns false when options list is empty', () => {
  expect(validate('a', [])).toBe(false);
});
