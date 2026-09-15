import {
  buildEventEnvelopeMetadata as buildSharedEventEnvelopeMetadata,
  CURRENT_EVENT_SCHEMA_VERSION as SHARED_CURRENT_EVENT_SCHEMA_VERSION
} from '@cvg-his-v2/shared-types';
import type { BuildEventEnvelopeInput, EventEnvelopeMetadata } from '@cvg-his-v2/shared-types';
import { EVENT_SCHEMA_VERSIONS } from './event-catalog.js';

export {
  assertEventEnvelopeMatches,
  mergeEventEnvelopeMetadata,
  readEventEnvelopeMetadata
} from '@cvg-his-v2/shared-types';
export type {
  BuildEventEnvelopeInput,
  EventActor,
  EventActorType,
  EventEnvelopeMetadata
} from '@cvg-his-v2/shared-types';
export { CURRENT_EVENT_SCHEMA_VERSION } from '@cvg-his-v2/shared-types';

export function buildEventEnvelopeMetadata(input: BuildEventEnvelopeInput): EventEnvelopeMetadata {
  return buildSharedEventEnvelopeMetadata({
    ...input,
    schemaVersion:
      input.schemaVersion ??
      EVENT_SCHEMA_VERSIONS[input.eventType] ??
      SHARED_CURRENT_EVENT_SCHEMA_VERSION
  });
}
