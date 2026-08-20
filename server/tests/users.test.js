import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, seedActors, auth, registerShopper } from './helpers/api.js';
import { truncateAll, closeDb } from './helpers/db.js';

let adminToken;
let customerToken;
let customerId;

beforeEach(async () => {
  await truncateAll();
  ({ adminToken, customerToken } = await seedActors());
  const profile = await api().get('/api/auth/profile').set(auth(customerToken));
  customerId = profile.body.data.id;
});

afterAll(closeDb);

describe('user authorization (backend-spec.md defect #2)', () => {
  it('refuses to let a customer list every user', async () => {
    const res = await api().get('/api/users').set(auth(customerToken));
    expect(res.status).toBe(403);
  });

  it('refuses to let a customer read another account', async () => {
    const admin = await api().get('/api/users').set(auth(adminToken));
    const adminId = admin.body.data.find((u) => u.role === 'admin').id;

    const res = await api().get(`/api/users/${adminId}`).set(auth(customerToken));
    expect(res.status).toBe(403);
  });

  it('refuses to let a customer edit another account', async () => {
    const admin = await api().get('/api/users').set(auth(adminToken));
    const adminId = admin.body.data.find((u) => u.role === 'admin').id;

    const res = await api()
      .put(`/api/users/${adminId}`)
      .set(auth(customerToken))
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('lets a customer edit themselves but SILENTLY DROPS a role change', async () => {
    const res = await api()
      .put(`/api/users/${customerId}`)
      .set(auth(customerToken))
      .send({ name: 'Renamed Self', role: 'admin' });

    // The edit is legitimate; the privilege escalation inside it is not.
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed Self');
    expect(res.body.data.role).toBe('user');
  });

  it('lets an admin change a role', async () => {
    const res = await api()
      .put(`/api/users/${customerId}`)
      .set(auth(adminToken))
      .send({ role: 'deliveryman' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('deliveryman');
  });

  it('refuses to let a customer delete anyone', async () => {
    const res = await api().delete(`/api/users/${customerId}`).set(auth(customerToken));
    expect(res.status).toBe(403);
  });
});

describe('user listing', () => {
  it('caps perPage so pagination cannot be used as a DoS', async () => {
    const res = await api().get('/api/users?perPage=99999').set(auth(adminToken));
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].path).toBe('perPage');
  });

  it('rejects a sort column outside the allow-list', async () => {
    const res = await api().get('/api/users?sortBy=password').set(auth(adminToken));
    expect(res.status).toBe(400);
  });

  it('filters by role and reports pagination meta', async () => {
    const res = await api().get('/api/users?role=admin').set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, total: 1, totalPages: 1 });
  });
});

describe('addresses', () => {
  it('keeps exactly one default through add, promote and delete', async () => {
    const { token, userId } = await registerShopper('addr@test.local');
    const add = (street, isDefault) =>
      api().post(`/api/users/${userId}/addresses`).set(auth(token))
        .send({ street, city: 'Dhaka', country: 'BD', postalCode: '1216', ...(isDefault !== undefined ? { isDefault } : {}) });

    const list = async () =>
      (await api().get(`/api/users/${userId}/addresses`).set(auth(token))).body.data;

    // registerShopper already created one, which must be the default.
    let rows = await list();
    expect(rows.filter((a) => a.isDefault)).toHaveLength(1);

    await add('Second St', true);
    rows = await list();
    expect(rows.filter((a) => a.isDefault)).toHaveLength(1);
    expect(rows.find((a) => a.isDefault).street).toBe('Second St');

    // Removing the default must promote a survivor, never leave zero.
    const defaultId = rows.find((a) => a.isDefault).id;
    await api().delete(`/api/users/${userId}/addresses/${defaultId}`).set(auth(token));
    rows = await list();
    expect(rows.filter((a) => a.isDefault)).toHaveLength(1);
  });

  it('will not let one user touch another user’s address by id', async () => {
    const victim = await registerShopper('victim@test.local');
    const attacker = await registerShopper('attacker@test.local');

    const res = await api()
      .put(`/api/users/${attacker.userId}/addresses/${victim.addressId}`)
      .set(auth(attacker.token))
      .send({ street: 'Stolen' });

    // Scoped by user id as well as address id, so it is simply not found.
    expect(res.status).toBe(404);
  });
});
