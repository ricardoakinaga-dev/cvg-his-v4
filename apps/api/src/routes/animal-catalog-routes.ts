import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { readJsonBody } from '../helpers/request-body.js';
import { matchesCollectionItemPath } from './resource-route-path.js';
import type {
  AnimalSpeciesInput,
  BreedInput,
  CoatColorInput,
  createAnimalSpeciesStore,
  createBreedStore,
  createCoatColorStore
} from '../repositories/animal-catalog-stores.js';

export interface AnimalCatalogRoutesHandlers {
  readonly breeds: ReturnType<typeof createBreedStore>;
  readonly animalSpecies: ReturnType<typeof createAnimalSpeciesStore>;
  readonly coatColors: ReturnType<typeof createCoatColorStore>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly appendAudit: (
    actorId: string,
    accountId: string,
    module: string,
    action: string,
    entityType: string,
    entityId: string,
    payloadSummary: string,
    riskLevel: 'low' | 'medium' | 'high',
    correlationId: string
  ) => void;
}

export async function handleAnimalCatalogRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AnimalCatalogRoutesHandlers
): Promise<boolean> {
  const { breeds, animalSpecies, coatColors, requirePrincipal, appendAudit } = handlers;

  if ((pathname === '/breeds' || pathname === '/breed') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const search = url.searchParams.get('search') ?? undefined;
    const activeParam = url.searchParams.get('active');
    const species = url.searchParams.get('species') ?? undefined;
    const active = activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
    const items = await breeds.list(principal.user.accountId, {
      search,
      active,
      species
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'breeds',
      'list',
      'breed',
      search ?? species ?? 'all',
      'Breeds catalog inspected',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/breeds' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request)) as BreedInput;
    const breed = await breeds.create(principal.user.accountId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'breeds',
      'create',
      'breed',
      breed.id,
      `Breed ${breed.name} created`,
      'medium',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(breed));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/breeds') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const breedId = requireNonEmptyString(pathname.split('/')[2], 'breedId');
    const breed = await breeds.getOrThrow(breedId);
    if (breed.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Breed not found for current account');
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'breeds',
      'read',
      'breed',
      breed.id,
      `Breed ${breed.name} inspected`,
      'low',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(breed));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/breeds') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'service.write');
    const breedId = requireNonEmptyString(pathname.split('/')[2], 'breedId');
    const existingBreed = await breeds.getOrThrow(breedId);
    if (existingBreed.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Breed not found for current account');
    }
    const payload = (await readJsonBody(request)) as BreedInput;
    const breed = await breeds.update(breedId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'breeds',
      'update',
      'breed',
      breed.id,
      `Breed ${breed.name} updated`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(breed));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/breeds') && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'service.write');
    const breedId = requireNonEmptyString(pathname.split('/')[2], 'breedId');
    const existingBreed = await breeds.getOrThrow(breedId);
    if (existingBreed.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Breed not found for current account');
    }
    await breeds.delete(breedId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'breeds',
      'delete',
      'breed',
      breedId,
      `Breed ${existingBreed.name} deleted`,
      'medium',
      correlationId
    );
    response.statusCode = 204;
    response.end();
    return true;
  }

  if ((pathname === '/species' || pathname === '/specie') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const search = url.searchParams.get('search') ?? undefined;
    const activeParam = url.searchParams.get('active');
    const systemCode = url.searchParams.get('systemCode') ?? undefined;
    const active = activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
    const items = await animalSpecies.list(principal.user.accountId, {
      search,
      active,
      systemCode
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'species',
      'list',
      'animal-species',
      search ?? systemCode ?? 'all',
      'Animal species catalog inspected',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/species' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request)) as AnimalSpeciesInput;
    const species = await animalSpecies.create(principal.user.accountId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'species',
      'create',
      'animal-species',
      species.id,
      `Animal species ${species.name} created`,
      'medium',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(species));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/species') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const speciesId = requireNonEmptyString(pathname.split('/')[2], 'speciesId');
    const species = await animalSpecies.getOrThrow(speciesId);
    if (species.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Animal species not found for current account');
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'species',
      'read',
      'animal-species',
      species.id,
      `Animal species ${species.name} inspected`,
      'low',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(species));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/species') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'service.write');
    const speciesId = requireNonEmptyString(pathname.split('/')[2], 'speciesId');
    const existingSpecies = await animalSpecies.getOrThrow(speciesId);
    if (existingSpecies.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Animal species not found for current account');
    }
    const payload = (await readJsonBody(request)) as AnimalSpeciesInput;
    const species = await animalSpecies.update(speciesId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'species',
      'update',
      'animal-species',
      species.id,
      `Animal species ${species.name} updated`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(species));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/species') && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'service.write');
    const speciesId = requireNonEmptyString(pathname.split('/')[2], 'speciesId');
    const existingSpecies = await animalSpecies.getOrThrow(speciesId);
    if (existingSpecies.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Animal species not found for current account');
    }
    await animalSpecies.delete(speciesId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'species',
      'delete',
      'animal-species',
      speciesId,
      `Animal species ${existingSpecies.name} deleted`,
      'medium',
      correlationId
    );
    response.statusCode = 204;
    response.end();
    return true;
  }

  if (
    (pathname === '/coat-colors' || pathname === '/coat-color' || pathname === '/pelagens') &&
    request.method === 'GET'
  ) {
    const principal = await requirePrincipal(request, 'service.read');
    const search = url.searchParams.get('search') ?? undefined;
    const activeParam = url.searchParams.get('active');
    const colorGroup = url.searchParams.get('colorGroup') ?? undefined;
    const active = activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
    const items = await coatColors.list(principal.user.accountId, {
      search,
      active,
      colorGroup
    });
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'coat-colors',
      'list',
      'coat-color',
      search ?? colorGroup ?? 'all',
      'Coat colors catalog inspected',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/coat-colors' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'service.write');
    const payload = (await readJsonBody(request)) as CoatColorInput;
    const coatColor = await coatColors.create(principal.user.accountId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'coat-colors',
      'create',
      'coat-color',
      coatColor.id,
      `Coat color ${coatColor.name} created`,
      'medium',
      correlationId
    );
    response.statusCode = 201;
    response.end(JSON.stringify(coatColor));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/coat-colors') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'service.read');
    const coatColorId = requireNonEmptyString(pathname.split('/')[2], 'coatColorId');
    const coatColor = await coatColors.getOrThrow(coatColorId);
    if (coatColor.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Coat color not found for current account');
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'coat-colors',
      'read',
      'coat-color',
      coatColor.id,
      `Coat color ${coatColor.name} inspected`,
      'low',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(coatColor));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/coat-colors') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'service.write');
    const coatColorId = requireNonEmptyString(pathname.split('/')[2], 'coatColorId');
    const existingCoatColor = await coatColors.getOrThrow(coatColorId);
    if (existingCoatColor.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Coat color not found for current account');
    }
    const payload = (await readJsonBody(request)) as CoatColorInput;
    const coatColor = await coatColors.update(coatColorId, payload);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'coat-colors',
      'update',
      'coat-color',
      coatColor.id,
      `Coat color ${coatColor.name} updated`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(coatColor));
    return true;
  }

  if (matchesCollectionItemPath(pathname, '/coat-colors') && request.method === 'DELETE') {
    const principal = await requirePrincipal(request, 'service.write');
    const coatColorId = requireNonEmptyString(pathname.split('/')[2], 'coatColorId');
    const existingCoatColor = await coatColors.getOrThrow(coatColorId);
    if (existingCoatColor.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Coat color not found for current account');
    }
    await coatColors.delete(coatColorId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'coat-colors',
      'delete',
      'coat-color',
      coatColorId,
      `Coat color ${existingCoatColor.name} deleted`,
      'medium',
      correlationId
    );
    response.statusCode = 204;
    response.end();
    return true;
  }

  return false;
}
