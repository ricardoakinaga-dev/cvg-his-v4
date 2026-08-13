import type { IncomingMessage, ServerResponse } from 'node:http';

import { handleAttachmentsRoutes, type AttachmentsRoutesHandlers } from './attachments-routes.js';
import {
  handleClinicalHandoffsRoutes,
  type ClinicalHandoffsRoutesHandlers
} from './clinical-handoffs-routes.js';
import {
  handleInpatientQueryRoutes,
  type InpatientQueryRoutesHandlers
} from './inpatient-query-routes.js';
import {
  handleMedicalRecordsRoutes,
  type MedicalRecordsRoutesHandlers
} from './medical-records-routes.js';
import {
  handleNotificationsRoutes,
  type NotificationsRoutesHandlers
} from './notifications-routes.js';

export interface ClinicalDispatchRoutesHandlers
  extends AttachmentsRoutesHandlers,
    ClinicalHandoffsRoutesHandlers,
    InpatientQueryRoutesHandlers,
    MedicalRecordsRoutesHandlers,
    NotificationsRoutesHandlers {}

export async function handleClinicalDispatchRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ClinicalDispatchRoutesHandlers
): Promise<boolean> {
  return (
    (await handleMedicalRecordsRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handleAttachmentsRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handleInpatientQueryRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handleNotificationsRoutes(pathname, request, response, correlationId, handlers)) ||
    (await handleClinicalHandoffsRoutes(pathname, request, response, correlationId, handlers))
  );
}
