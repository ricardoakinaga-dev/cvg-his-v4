export function matchesCollectionItemPath(pathname: string, collectionPath: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, '');
  const prefix = `${collectionPath}/`;
  if (!normalizedPath.startsWith(prefix)) return false;

  const itemPath = normalizedPath.slice(prefix.length);
  return itemPath.length > 0 && !itemPath.includes('/');
}

export function matchesCollectionItemActionPath(
  pathname: string,
  collectionPath: string,
  action: string
): boolean {
  const prefix = `${collectionPath}/`;
  if (!pathname.startsWith(prefix)) return false;

  const segments = pathname.slice(prefix.length).split('/');
  return segments.length === 2 && segments[0]!.length > 0 && segments[1] === action;
}
