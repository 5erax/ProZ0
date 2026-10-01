import { expect, test } from 'vitest';
import { OrderedInputQueue } from '../../src/server/pilot/OrderedInputQueue';
test('slow transport keeps latest adjacent movement without moving it across a gameplay command', async () => {
  const delivered: number[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const queue = new OrderedInputQueue<number>(async value => {
    if (value === 1) await gate;
    delivered.push(value);
  }, () => { throw Error('Unexpected failure'); });
  queue.push(1);
  queue.push(2, true); queue.push(3, true);
  queue.push(4); // Gameplay command must remain between movement batches.
  queue.push(5, true); queue.push(6, true);
  queue.push(7); // Disconnect remains after every accepted command.
  release();
  await expect.poll(() => delivered).toEqual([1, 3, 4, 6, 7]);
});
