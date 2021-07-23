import { generateTeam, classGenerator } from '../generators';
import Character from '../Character';

test('should generate team', () => {
  const options = [{ attack: 40, defence: 10, type: 'swordsman' },
    { attack: 25, defence: 25, type: 'bowman' }];
  const types = [...classGenerator(options)];
  const team = generateTeam(types, 3, 3);
  expect(team.length).toBe(3);
  team.forEach((char) => {
    expect(char.level).toBeGreaterThanOrEqual(1);
    expect(char.level).toBeLessThanOrEqual(3);
    expect(['bowman', 'swordsman'].includes(char.type)).toBe(true);
    expect(char instanceof Character).toBe(true);
  });
});
