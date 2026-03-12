import { validate } from '@/rules/ends_with';

test('validates that the value ends with the given suffix', () => {
  expect(validate('hello world', ['world'])).toBe(true);
  expect(validate('hello', ['lo'])).toBe(true);
  expect(validate('ab', ['b'])).toBe(true);
  expect(validate('x', ['x'])).toBe(true);

  expect(validate('hello', ['world'])).toBe(false);
  expect(validate('world', ['hello'])).toBe(false);
  expect(validate('ab', ['a'])).toBe(false);
  expect(validate('', ['x'])).toBe(false);
});

test('validates with object params (suffix)', () => {
  expect(validate('hello', { suffix: 'lo' })).toBe(true);
  expect(validate('world', { suffix: 'lo' })).toBe(false);
});

test('validates arrays by checking each element', () => {
  expect(validate(['foo', 'bo'], ['o'])).toBe(true);
  expect(validate(['hello', 'bye'], ['o'])).toBe(false);
});

test('returns false when suffix is missing', () => {
  expect(validate('hello', [])).toBe(false);
  expect(validate('hello', {})).toBe(false);
});
