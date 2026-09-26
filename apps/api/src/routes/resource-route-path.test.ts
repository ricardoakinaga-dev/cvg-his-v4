import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchesCollectionItemActionPath,
  matchesCollectionItemPath
} from './resource-route-path.js';

test('collection item paths accept one item segment and optional trailing slashes', () => {
  assert.equal(matchesCollectionItemPath('/products/product-1', '/products'), true);
  assert.equal(matchesCollectionItemPath('/products/product-1/', '/products'), true);
  assert.equal(matchesCollectionItemPath('/products/product-1///', '/products'), true);
  assert.equal(matchesCollectionItemPath('/products/product-1/extra', '/products'), false);
  assert.equal(matchesCollectionItemPath('/products/', '/products'), false);
  assert.equal(matchesCollectionItemPath('/products//product-1', '/products'), false);
  assert.equal(matchesCollectionItemPath('/products-extra/product-1', '/products'), false);
});

test('collection item action paths require one item and the exact action segment', () => {
  assert.equal(
    matchesCollectionItemActionPath(
      '/vaccines-dewormers/event-1/execute',
      '/vaccines-dewormers',
      'execute'
    ),
    true
  );
  assert.equal(
    matchesCollectionItemActionPath(
      '/vaccines-dewormers/event-1/email',
      '/vaccines-dewormers',
      'email'
    ),
    true
  );
  assert.equal(
    matchesCollectionItemActionPath(
      '/vaccines-dewormers/event-1/extra/execute',
      '/vaccines-dewormers',
      'execute'
    ),
    false
  );
  assert.equal(
    matchesCollectionItemActionPath(
      '/vaccines-dewormers/event-1/execute/',
      '/vaccines-dewormers',
      'execute'
    ),
    false
  );
  assert.equal(
    matchesCollectionItemActionPath(
      '/vaccines-dewormers//execute',
      '/vaccines-dewormers',
      'execute'
    ),
    false
  );
});
