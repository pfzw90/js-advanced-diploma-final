import Character from '../Character';
import { classGenerator, characterGenerator } from '../generators';

test('should throw error when new Character created', () => {
  expect(() => new Character(1)).toThrow(new Error('Forbidden to create Character class instance'));
});

test('should create child Character class instances without throwing errors', () => {
  const options = [{ attack: 40, defence: 10, type: 'swordsman' }];
  const types = [...classGenerator(options)];
  const char = characterGenerator(types, 1);
  const result = char.next().value;
  expect(result instanceof types[0]).toBe(true);
  expect(result instanceof Character).toBe(true);
});
