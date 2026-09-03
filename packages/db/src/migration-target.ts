export interface NamedMigration {
  readonly name: string;
}

/**
 * Select an inclusive, ordered migration prefix for installation/upgrade drills.
 * Production normally omits a target and therefore always migrates to HEAD.
 */
export function selectMigrationsThrough<T extends NamedMigration>(
  files: readonly T[],
  targetMigration?: string
): readonly T[] {
  const target = targetMigration?.trim();
  if (!target) return files;

  const targetIndex = files.findIndex((file) => file.name === target);
  if (targetIndex === -1) {
    throw new Error(`unknown migration target: ${target}`);
  }
  return files.slice(0, targetIndex + 1);
}
