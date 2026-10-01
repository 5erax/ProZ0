import { expect, test } from 'vitest';
import { hashLobbyPassword, verifyLobbyPassword } from '../../src/server/pilot/LobbyAccounts';
import { validateRoomName } from '../../src/server/pilot/LobbyRooms';

test('account and room passwords use distinct salts and reject wrong or malformed credentials', async () => {
  const password = 'an example long password';
  const first = await hashLobbyPassword(password);
  const second = await hashLobbyPassword(password);
  expect(first).not.toBe(second);
  expect(first).not.toContain(password);
  expect(await verifyLobbyPassword(password, first)).toBe(true);
  expect(await verifyLobbyPassword('wrong password', first)).toBe(false);
  expect(await verifyLobbyPassword(password, 'invalid')).toBe(false);
});

test('room names accept Vietnamese and normalize Unicode while rejecting control characters', () => {
  expect(validateRoomName('  Căn cứ bạn bè  ')).toBe('Căn cứ bạn bè');
  expect(validateRoomName('Cafe\u0301')).toBe('Café');
  for (const name of ['', 'ab', 'x'.repeat(33), 'room\nname', 'room\u007fname'])
    expect(() => validateRoomName(name)).toThrow();
});
