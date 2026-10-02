import { expect, it } from 'vitest';
import { LivingMotion } from '../../src/client/presentation/LivingMotion';
it('interpolates wildlife world motion without mutating authority coordinates; snaps relocation and carcasses', () => {
  const motion = new LivingMotion();
  const origin = Object.freeze({ x: 10, y: 20 }), next = Object.freeze({ x: 11, y: 20 });
  expect(motion.position('goat', origin, 60, 1000, 'pen:1', true)).toEqual(origin);
  expect(motion.position('goat', next, 120, 2000, 'pen:1', true)).toEqual(origin);
  expect(motion.position('goat', next, 120, 2500, 'pen:1', true)).toEqual({ x: 10.5, y: 20 });
  expect(next).toEqual({ x: 11, y: 20 });
  expect(motion.position('goat', { x: 11.5, y: 20 }, 180, 2600, 'pen:2', true)).toEqual({ x: 11.5, y: 20 });
  expect(motion.position('goat', { x: 70, y: 20 }, 240, 2700, 'pen:2', true)).toEqual({ x: 70, y: 20 });
  expect(motion.position('goat', next, 240, 2800, 'pen:2', false)).toEqual(next);
  motion.retain(new Set());
  expect(motion.position('goat', origin, 300, 2900, 'pen:2', true)).toEqual(origin);
});
it('does not animate static plants when authority refreshes', () => {
  const motion = new LivingMotion();
  for (let now = 0; now < 2000; now += 16) expect(motion.position('plant', { x: 10.25, y: -4 }, now, now, '', false)).toEqual({ x: 10.25, y: -4 });
});
