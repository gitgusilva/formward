import { validate } from '@/rules/starts_with';

test('validates that the value starts with the given prefix', () => {
  expect(validate('hello', ['hello'])).toBe(true);
  expect(validate('hello world', ['hello'])).toBe(true);
  expect(validate('ab', ['a'])).toBe(true);

  expect(validate(' world', ['hello'])).toBe(false);
  expect(validate('bye', ['hello'])).toBe(false);
  expect(validate('hi there', ['hello'])).toBe(false);
  expect(validate('', ['hello'])).toBe(false);
});

test('validates with object params (prefix)', () => {
  expect(validate('hello', { prefix: 'hel' })).toBe(true);
  expect(validate('world', { prefix: 'hel' })).toBe(false);
});

test('validates arrays by checking each element', () => {
  expect(validate(['hello', 'hi'], ['h'])).toBe(true);
  expect(validate(['hello', 'bye'], ['h'])).toBe(false);
});

test('returns false when prefix is missing', () => {
  expect(validate('hello', [])).toBe(false);
  expect(validate('hello', {})).toBe(false);
});
