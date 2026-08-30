import {
  V2_ACCESS_CONTROL_PERMISSION_SEEDS,
  V2_ACCESS_CONTROL_ROLE_SEEDS
} from '@cvg-his/rbac';

export const DB_ACCESS_CONTROL_PERMISSION_SEEDS = V2_ACCESS_CONTROL_PERMISSION_SEEDS.map(
  (permission) => ({
    key: permission.key,
    description: permission.description
  })
);

export const DB_ACCESS_CONTROL_ROLE_SEEDS = V2_ACCESS_CONTROL_ROLE_SEEDS.map((role) => ({
  name: role.name,
  description: role.description
}));

export const DB_ACCESS_CONTROL_ROLE_PERMISSION_MAP = Object.fromEntries(
  V2_ACCESS_CONTROL_ROLE_SEEDS.map((role) => [role.name, [...role.permissionCodes]])
);
