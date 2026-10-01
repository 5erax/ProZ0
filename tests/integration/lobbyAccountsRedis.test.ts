import { expect, test } from 'vitest';
import { createClient } from 'redis';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import { HostedClientConnection } from '../../src/client/network/HostedClientConnection';
import { HOSTED_PROTOCOL_VERSION, type ClientHelloV1 } from '../../src/protocol';
import { createRedisColonyPilot } from '../../src/server/pilot/RedisColonyPilot';

const redisUrl = process.env.REDIS_URL;
test.skipIf(!redisUrl)('real accounts protect named rooms, survive re-login, and revoke sessions on recovery', async () => {
  const namespace = 'proz0:test:lobby:' + randomBytes(8).toString('hex');
  const service = createRedisColonyPilot({ url: redisUrl!, namespace, allowedOrigins: ['http://localhost:4173'] });
  const store = createClient({ url: redisUrl! });
  const peers: WebSocket[] = [];
  try {
    await service.ready();
    await store.connect();
    await new Promise<void>(done => service.server.listen(0, '127.0.0.1', done));
    const address = service.server.address();
    if (!address || typeof address === 'string') throw Error('Missing address');
    const base = 'http://127.0.0.1:' + address.port;
    let requestId = 0;
    const request = async (path: string, method = 'GET', data?: unknown, cookie = '', origin = 'http://localhost:4173', authorization = '') => {
      const response = await fetch(base + path, { method, headers: {
        'Content-Type': 'application/json', Cookie: cookie, Origin: origin,
        'X-Forwarded-For': '192.0.2.' + (++requestId),
        Authorization: authorization,
      }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '', header: response.headers.get('set-cookie') ?? '' };
    };
    const password = 'colony account password 1';
    const owner = await request('/auth/register', 'POST', { username: 'owner', password });
    expect(owner.status).toBe(200);
    expect(owner.header).toContain('HttpOnly');
    expect(owner.header).toContain('SameSite=Lax');
    expect(Object.keys(owner.data.account).sort()).toEqual(['displayName', 'id', 'skin', 'username']);
    expect(owner.data.account.displayName).toBe('owner');
    expect(owner.data.recoveryCode).toMatch(/^[a-f0-9]{48}$/);
    const guest = await request('/auth/register', 'POST', { username: 'guest', password });
    expect((await request('/auth/register', 'POST', { username: 'OWNER', password })).status).toBe(409);
    expect((await request('/auth/login', 'POST', { username: 'owner', password: 'wrong long password' })).status).toBe(401);
    expect((await request('/auth/profile', 'POST', { skin: 'azure' }, owner.cookie, 'https://malicious.example')).status).toBe(403);
    expect((await request('/auth/profile', 'POST', { skin: 'azure' }, owner.cookie)).data.account.skin).toBe('azure');
    const profile=await request('/auth/profile','POST',{displayName:'Bạn chủ phòng'},owner.cookie);
    expect(profile.data.account).toMatchObject({displayName:'Bạn chủ phòng',username:'owner',skin:'azure'});
    expect((await request('/auth/profile','POST',{displayName:'bad\nname'},owner.cookie)).status).toBe(400);
    expect((await request('/auth/login','POST',{username:'owner',password})).data.account.displayName).toBe('Bạn chủ phòng');
    expect((await request('/lobby/rooms')).status).toBe(401);
    const created = await request('/lobby/rooms', 'POST', { name: 'Căn cứ Việt', password: 'private1' }, owner.cookie);
    expect(created.status).toBe(201);
    const roomId = created.data.id;
    expect(created.data.ownerToken).toBeTruthy();
    expect(created.data.skin).toBe('azure');
    const list = await request('/lobby/rooms', 'GET', undefined, guest.cookie);
    expect(list.data.rooms).toEqual([{ id: roomId, name: 'Căn cứ Việt', owned: false, maxPlayers: 3 }]);
    expect((await request('/lobby/join', 'POST', { name: 'Căn cứ Việt', password: 'wrong1' }, guest.cookie)).status).toBe(403);
    const joined = await request('/lobby/join', 'POST', { name: 'Căn cứ Việt', password: 'private1' }, guest.cookie);
    expect(joined.status).toBe(200);
    expect(joined.data.ownerToken).toBeUndefined();
    expect(joined.data.clientKey).not.toBe(created.data.clientKey);
    const stolenOwnerToken = 'Bearer ' + created.data.ownerToken;
    // Named-room owner APIs require the owner account even if a bearer token was copied.
    for (const [suffix, method] of [['/save', 'POST'], ['/export', 'GET'], ['', 'DELETE']] as const)
      expect((await request('/rooms/' + roomId + suffix, method, undefined, guest.cookie, 'http://localhost:4173', stolenOwnerToken)).status).toBe(403);
    const connect = async (details: typeof created.data, cookie: string, resumeCredential?: string) => {
      const ws = new WebSocket(base.replace('http:', 'ws:') + '/rooms/' + roomId + '/socket',
        ['proz0.access.' + details.accessToken, 'proz0.client.' + details.clientKey],
        { headers: { Cookie: cookie, Origin: 'http://localhost:4173' } });
      peers.push(ws);
      const connection = new HostedClientConnection({ transport: { sendText: text => ws.send(text), close: () => ws.close() },
        hello: { protocolVersion: HOSTED_PROTOCOL_VERSION, contentCompatibility: details.contentCompatibility,
          worldCompatibility: details.worldCompatibility, ...(resumeCredential ? { resumeCredential } : {}) } as ClientHelloV1 });
      ws.on('open', () => connection.start());
      ws.on('message', data => connection.handleText(data.toString()));
      await expect.poll(() => connection.getState(), { timeout: 20000 }).toBe('READY');
      return { ws, connection };
    };
    const ownerPeer = await connect(created.data, owner.cookie);
    const guestPeer = await connect(joined.data, guest.cookie, ownerPeer.connection.getResumeCredential()!);
    // Even a known resume credential cannot move a guest account into the owner's colonist.
    expect(guestPeer.connection.getPlayerId()).not.toBe(ownerPeer.connection.getPlayerId());
    for (const ws of peers) ws.close();
    expect((await request('/lobby/rooms/' + roomId, 'PATCH', { name: 'stolen', password: 'stolen1' }, guest.cookie)).status).toBe(403);
    expect((await request('/rooms/' + roomId, 'GET', undefined)).status).toBe(401);
    const relogged = await request('/auth/login', 'POST', { username: 'guest', password });
    const continued = await request('/lobby/rooms/' + roomId + '/continue', 'POST', {}, relogged.cookie);
    expect(continued.data.clientKey).toBe(joined.data.clientKey);
    expect((await request('/lobby/rooms/' + roomId, 'PATCH', { name: 'Căn cứ mới', password: 'private2' }, owner.cookie)).status).toBe(200);
    expect((await request('/lobby/rooms/' + roomId + '/continue', 'POST', {}, guest.cookie)).status).toBe(403);
    expect((await request('/lobby/join', 'POST', { name: 'Căn cứ mới', password: 'private1' }, guest.cookie)).status).toBe(403);
    expect((await request('/lobby/join', 'POST', { name: 'Căn cứ mới', password: 'private2' }, guest.cookie)).status).toBe(200);
    const recovered = await request('/auth/recover', 'POST', { username: 'owner', password: 'new account password 2', recoveryCode: owner.data.recoveryCode });
    expect(recovered.status).toBe(200);
    expect(recovered.data.recoveryCode).not.toBe(owner.data.recoveryCode);
    expect((await request('/auth/me', 'GET', undefined, owner.cookie)).data.account).toBeNull();
    expect((await request('/auth/login', 'POST', { username: 'owner', password })).status).toBe(401);
    expect((await request('/auth/recover', 'POST', { username: 'owner', password, recoveryCode: owner.data.recoveryCode })).status).toBe(401);
    expect((await request('/lobby/rooms/' + roomId + '/continue', 'POST', {}, recovered.cookie)).data.clientKey).toBe(created.data.clientKey);
    await expect.poll(() => store.get(namespace + ':' + roomId + ':lease'), { timeout: 20000 }).toBeNull();
    expect((await request('/lobby/rooms/' + roomId, 'DELETE', undefined, recovered.cookie)).status).toBe(200);
    expect((await request('/lobby/rooms', 'GET', undefined, guest.cookie)).data.rooms).toEqual([]);
    expect((await request('/auth/logout', 'POST', {}, guest.cookie)).status).toBe(200);
    expect((await request('/auth/me', 'GET', undefined, guest.cookie)).data.account).toBeNull();
  } finally {
    for (const ws of peers) ws.close();
    await service.close();
    if (service.server.listening) await new Promise<void>(done => service.server.close(() => done()));
    if (store.isOpen) {
      const keys = await store.keys(namespace + ':*');
      if (keys.length) await store.del(keys);
      await store.quit();
    }
  }
}, 120000);
