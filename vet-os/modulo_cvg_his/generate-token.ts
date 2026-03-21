#!/usr/bin/env -S node --import tsx

import { signJwt } from './apps/his-api/src/modules/auth/service.js';

const payload = {
  accountId: 'f03d8820-104a-4835-8d48-6bf6c18c38ea',
  roles: ['admin'],
  permissions: ['users.read', 'roles.read']
};

const options = {
  jwtSecret: 'change-me',
  jwtIssuer: 'cvg-his',
  jwtAudience: 'cvg-his-api',
  expiresIn: 8 * 60 * 60
};

const token = signJwt(payload, options);
console.log(token);
