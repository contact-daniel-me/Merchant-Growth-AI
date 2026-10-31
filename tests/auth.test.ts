import test from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../src/server/auth/authService.ts';
import { AppDatabase } from '../src/server/db/database.ts';

test('AuthService: Authenticates valid merchant credentials', () => {
  AppDatabase.getDB();
  const auth = AuthService.authenticateUser('sunil_sharma', 'Password123!');
  assert.ok(auth, 'Authentication should succeed for valid credentials');
  assert.strictEqual(auth.merchant.id, 'mer_sharma_kirana');
  assert.ok(auth.token, 'Should return a signed session token');

  const payload = AuthService.verifyToken(auth.token);
  assert.ok(payload, 'Token should verify successfully');
  assert.strictEqual(payload?.merchantId, 'mer_sharma_kirana');
});

test('AuthService: Rejects invalid passwords', () => {
  AppDatabase.getDB();
  const auth = AuthService.authenticateUser('sunil_sharma', 'WrongPassword!');
  assert.strictEqual(auth, null, 'Authentication must fail on wrong password');
});

test('AuthService: Rejects non-existent usernames', () => {
  AppDatabase.getDB();
  const auth = AuthService.authenticateUser('ghost_user_999', 'Password123!');
  assert.strictEqual(auth, null, 'Authentication must fail for missing user');
});

test('AuthService: Detects tampered tokens', () => {
  const token = AuthService.generateToken({
    userId: 'usr_test',
    merchantId: 'mer_sharma_kirana',
    role: 'OWNER',
    fullName: 'Test Owner',
  });

  const tamperedToken = token.slice(0, -6) + 'abc123';
  const payload = AuthService.verifyToken(tamperedToken);
  assert.strictEqual(payload, null, 'Tampered token must fail validation');
});
