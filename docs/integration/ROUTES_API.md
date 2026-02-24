# ROUTES API Map (his-api)

Generated from `apps/his-api/src/routes/index.ts` registrations and each module `routes.ts`.

## Route Registry

| Module Symbol | Prefix | Route File | Registered At |
|---|---|---|---|
| healthRoutes | (none) | `apps/his-api/src/routes/health.ts` | `apps/his-api/src/routes/index.ts:34` |
| systemRoutes | (none) | `apps/his-api/src/modules/system/routes.ts` | `apps/his-api/src/routes/index.ts:35` |
| buildRoutes | (none) | `apps/his-api/src/modules/build/routes.ts` | `apps/his-api/src/routes/index.ts:36` |
| authRoutes | /auth | `apps/his-api/src/modules/auth/routes.ts` | `apps/his-api/src/routes/index.ts:37` |
| auditRoutes | (none) | `apps/his-api/src/modules/audit/routes.ts` | `apps/his-api/src/routes/index.ts:38` |
| alertsRoutes | /alerts | `apps/his-api/src/modules/alerts/routes.ts` | `apps/his-api/src/routes/index.ts:39` |
| rbacRoutes | (none) | `apps/his-api/src/modules/rbac/routes.ts` | `apps/his-api/src/routes/index.ts:40` |
| clinicalNotesRoutes | (none) | `apps/his-api/src/modules/clinicalNotes/routes.ts` | `apps/his-api/src/routes/index.ts:41` |
| documentsRoutes | (none) | `apps/his-api/src/modules/documents/routes.ts` | `apps/his-api/src/routes/index.ts:42` |
| wardsRoutes | /wards | `apps/his-api/src/modules/wards/routes.ts` | `apps/his-api/src/routes/index.ts:43` |
| bedMapRoutes | /beds | `apps/his-api/src/modules/bedmap/routes.ts` | `apps/his-api/src/routes/index.ts:44` |
| bedsRoutes | /beds | `apps/his-api/src/modules/beds/routes.ts` | `apps/his-api/src/routes/index.ts:45` |
| ownersRoutes | /owners | `apps/his-api/src/modules/owners/routes.ts` | `apps/his-api/src/routes/index.ts:46` |
| protocolsRoutes | /protocols | `apps/his-api/src/modules/protocols/routes.ts` | `apps/his-api/src/routes/index.ts:47` |
| protocolReferencesRoutes | /protocols | `apps/his-api/src/modules/protocolReferences/routes.ts` | `apps/his-api/src/routes/index.ts:48` |
| protocolDiffRoutes | (none) | `apps/his-api/src/modules/protocolDiff/routes.ts` | `apps/his-api/src/routes/index.ts:49` |
| protocolPublishRoutes | (none) | `apps/his-api/src/modules/protocolPublish/routes.ts` | `apps/his-api/src/routes/index.ts:50` |
| protocolVersionsRoutes | (none) | `apps/his-api/src/modules/protocolVersions/routes.ts` | `apps/his-api/src/routes/index.ts:51` |
| patientsRoutes | /patients | `apps/his-api/src/modules/patients/routes.ts` | `apps/his-api/src/routes/index.ts:52` |
| encountersRoutes | /encounters | `apps/his-api/src/modules/encounters/routes.ts` | `apps/his-api/src/routes/index.ts:53` |
| inpatientRoutes | /inpatient | `apps/his-api/src/modules/inpatient/routes.ts` | `apps/his-api/src/routes/index.ts:54` |
| medicationOrdersRoutes | /medication-orders | `apps/his-api/src/modules/medicationOrders/routes.ts` | `apps/his-api/src/routes/index.ts:55` |
| medicationSchedulesRoutes | /medication-orders | `apps/his-api/src/modules/medicationSchedules/routes.ts` | `apps/his-api/src/routes/index.ts:56` |
| medicationAdministrationsRoutes | /medication-administrations | `apps/his-api/src/modules/medicationAdministrations/routes.ts` | `apps/his-api/src/routes/index.ts:57` |
| medicationDosesRoutes | /medication-doses | `apps/his-api/src/modules/medicationDoses/routes.ts` | `apps/his-api/src/routes/index.ts:58` |
| medicationLogsRoutes | /medication-logs | `apps/his-api/src/modules/medicationLogs/routes.ts` | `apps/his-api/src/routes/index.ts:59` |
| handoversRoutes | /handovers | `apps/his-api/src/modules/handovers/routes.ts` | `apps/his-api/src/routes/index.ts:60` |
| searchRoutes | /search | `apps/his-api/src/modules/search/routes.ts` | `apps/his-api/src/routes/index.ts:61` |
| patientContextRoutes | /patient-context | `apps/his-api/src/modules/patientContext/routes.ts` | `apps/his-api/src/routes/index.ts:62` |

## Endpoints

Total endpoints detected: **92**

| Method | Full Path | preHandler/auth | Permission | Handler |
|---|---|---|---|---|
| POST | `/admin/audit-test` | requirePermission | system.admin.test | `apps/his-api/src/modules/audit/routes.ts:87` |
| GET | `/admin/test` | requirePermission | system.admin.test | `apps/his-api/src/modules/rbac/routes.ts:8` |
| GET | `/alerts/` | requirePermission | alerts.read | `apps/his-api/src/modules/alerts/routes.ts:43` |
| POST | `/alerts/:alertId/acknowledge` | requirePermission | alerts.write | `apps/his-api/src/modules/alerts/routes.ts:81` |
| POST | `/alerts/:alertId/resolve` | requirePermission | alerts.write | `apps/his-api/src/modules/alerts/routes.ts:108` |
| POST | `/alerts/batch/acknowledge` | requirePermission | alerts.write | `apps/his-api/src/modules/alerts/routes.ts:135` |
| POST | `/alerts/batch/resolve` | requirePermission | alerts.write | `apps/his-api/src/modules/alerts/routes.ts:161` |
| POST | `/alerts/scan` | requirePermission | system.admin.test | `apps/his-api/src/modules/alerts/routes.ts:55` |
| GET | `/audit` | requirePermission | audit.read | `apps/his-api/src/modules/audit/routes.ts:15` |
| GET | `/audit/test` | requirePermission | audit.read | `apps/his-api/src/modules/rbac/routes.ts:20` |
| POST | `/auth/dev-login` | none | - | `apps/his-api/src/modules/auth/routes.ts:138` |
| POST | `/auth/login` | none | - | `apps/his-api/src/modules/auth/routes.ts:51` |
| GET | `/auth/me` | none | - | `apps/his-api/src/modules/auth/routes.ts:223` |
| POST | `/auth/verify` | none | - | `apps/his-api/src/modules/auth/routes.ts:189` |
| GET | `/beds/` | requirePermission | bed.read | `apps/his-api/src/modules/beds/routes.ts:20` |
| POST | `/beds/` | requirePermission | bed.write | `apps/his-api/src/modules/beds/routes.ts:32` |
| PATCH | `/beds/:id` | requirePermission | bed.write | `apps/his-api/src/modules/beds/routes.ts:50` |
| GET | `/beds/map` | requirePermission | bedmap.read | `apps/his-api/src/modules/bedmap/routes.ts:12` |
| GET | `/build` | none | - | `apps/his-api/src/modules/build/routes.ts:7` |
| POST | `/documents` | requirePermission | document.write | `apps/his-api/src/modules/documents/routes.ts:21` |
| GET | `/documents/:id` | requirePermission | document.read | `apps/his-api/src/modules/documents/routes.ts:60` |
| GET | `/encounters/` | requirePermission | encounter.read | `apps/his-api/src/modules/encounters/routes.ts:67` |
| POST | `/encounters/` | requirePermission | encounter.write | `apps/his-api/src/modules/encounters/routes.ts:13` |
| GET | `/encounters/:id` | requirePermission | encounter.read | `apps/his-api/src/modules/encounters/routes.ts:31` |
| POST | `/encounters/:id/close` | requirePermission | encounter.close | `apps/his-api/src/modules/encounters/routes.ts:79` |
| POST | `/encounters/:id/documents` | requirePermission | document.write | `apps/his-api/src/modules/documents/routes.ts:34` |
| POST | `/encounters/:id/notes` | requirePermission | note.write | `apps/his-api/src/modules/clinicalNotes/routes.ts:33` |
| GET | `/encounters/:id/timeline` | requirePermission | timeline.read | `apps/his-api/src/modules/encounters/routes.ts:49` |
| GET | `/handovers/:id` | requirePermission | handover.read | `apps/his-api/src/modules/handovers/routes.ts:113` |
| GET | `/handovers/:id/document` | requirePermission | handover.read | `apps/his-api/src/modules/handovers/routes.ts:131` |
| POST | `/handovers/:id/publish` | requirePermission | handover.publish | `apps/his-api/src/modules/handovers/routes.ts:58` |
| POST | `/handovers/draft` | requirePermission | handover.write | `apps/his-api/src/modules/handovers/routes.ts:28` |
| GET | `/handovers/latest` | requirePermission | handover.read | `apps/his-api/src/modules/handovers/routes.ts:93` |
| GET | `/health` | none | - | `apps/his-api/src/routes/health.ts:14` |
| GET | `/health/db` | none | - | `apps/his-api/src/routes/health.ts:26` |
| GET | `/health/redis` | none | - | `apps/his-api/src/routes/health.ts:33` |
| POST | `/inpatient/admit` | requirePermission | inpatient.write | `apps/his-api/src/modules/inpatient/routes.ts:26` |
| GET | `/inpatient/stays` | requirePermission | inpatient.read | `apps/his-api/src/modules/inpatient/routes.ts:154` |
| GET | `/inpatient/stays/:id` | requirePermission | inpatient.read | `apps/his-api/src/modules/inpatient/routes.ts:136` |
| POST | `/inpatient/stays/:id/discharge` | requirePermission | inpatient.discharge | `apps/his-api/src/modules/inpatient/routes.ts:110` |
| POST | `/inpatient/stays/:id/transfer` | requirePermission | inpatient.write | `apps/his-api/src/modules/inpatient/routes.ts:64` |
| GET | `/medication-administrations/` | requirePermission | medadmin.read | `apps/his-api/src/modules/medicationAdministrations/routes.ts:100` |
| POST | `/medication-administrations/` | requirePermission | medadmin.write | `apps/his-api/src/modules/medicationAdministrations/routes.ts:35` |
| GET | `/medication-doses/due` | requirePermission | medorder.read | `apps/his-api/src/modules/medicationDoses/routes.ts:13` |
| GET | `/medication-logs/` | requirePermission | medlog.read | `apps/his-api/src/modules/medicationLogs/routes.ts:8` |
| GET | `/medication-orders/` | requirePermission | medorder.read | `apps/his-api/src/modules/medicationOrders/routes.ts:65` |
| POST | `/medication-orders/` | requirePermission | medorder.write | `apps/his-api/src/modules/medicationOrders/routes.ts:17` |
| GET | `/medication-orders/:id` | requirePermission | medorder.read | `apps/his-api/src/modules/medicationOrders/routes.ts:47` |
| PATCH | `/medication-orders/:id` | requirePermission | medorder.write | `apps/his-api/src/modules/medicationOrders/routes.ts:77` |
| PATCH | `/medication-orders/:id/schedule` | requirePermission | medorder.write | `apps/his-api/src/modules/medicationSchedules/routes.ts:57` |
| POST | `/medication-orders/:id/schedule` | requirePermission | medorder.write | `apps/his-api/src/modules/medicationSchedules/routes.ts:22` |
| POST | `/medication-orders/:id/stop` | requirePermission | medorder.stop | `apps/his-api/src/modules/medicationOrders/routes.ts:103` |
| GET | `/notes/:id` | requirePermission | note.read | `apps/his-api/src/modules/clinicalNotes/routes.ts:165` |
| PATCH | `/notes/:id` | requirePermission | note.write | `apps/his-api/src/modules/clinicalNotes/routes.ts:60` |
| POST | `/notes/:id/sign` | requirePermission | note.sign | `apps/his-api/src/modules/clinicalNotes/routes.ts:135` |
| POST | `/notes/:id/version` | requirePermission | note.version | `apps/his-api/src/modules/clinicalNotes/routes.ts:96` |
| GET | `/owners/` | requirePermission | owner.read | `apps/his-api/src/modules/owners/routes.ts:81` |
| POST | `/owners/` | requirePermission | owner.write | `apps/his-api/src/modules/owners/routes.ts:14` |
| GET | `/owners/:id` | requirePermission | owner.read | `apps/his-api/src/modules/owners/routes.ts:27` |
| PATCH | `/owners/:id` | requirePermission | owner.write | `apps/his-api/src/modules/owners/routes.ts:62` |
| GET | `/owners/:id/summary` | requirePermission | owner.read | `apps/his-api/src/modules/owners/routes.ts:45` |
| GET | `/patient-context/:patientId/info` | requirePermission | patient.read | `apps/his-api/src/modules/patientContext/routes.ts:71` |
| GET | `/patient-context/by-patient/:patientId` | requirePermission | patient.read | `apps/his-api/src/modules/patientContext/routes.ts:19` |
| GET | `/patient-context/by-stay/:stayId` | requirePermission | patient.read | `apps/his-api/src/modules/patientContext/routes.ts:45` |
| GET | `/patient-context/stay/:stayId` | requirePermission | patient.read | `apps/his-api/src/modules/patientContext/routes.ts:97` |
| GET | `/patients/` | requirePermission | patient.read | `apps/his-api/src/modules/patients/routes.ts:90` |
| POST | `/patients/` | requirePermission | patient.write | `apps/his-api/src/modules/patients/routes.ts:14` |
| GET | `/patients/:id` | requirePermission | patient.read | `apps/his-api/src/modules/patients/routes.ts:32` |
| PATCH | `/patients/:id` | requirePermission | patient.write | `apps/his-api/src/modules/patients/routes.ts:67` |
| GET | `/patients/:id/summary` | requirePermission | patient.read | `apps/his-api/src/modules/patients/routes.ts:50` |
| GET | `/protocol-versions/:a/diff/:b` | requirePermission | protocol.diff.read | `apps/his-api/src/modules/protocolDiff/routes.ts:13` |
| GET | `/protocol-versions/:versionId` | requirePermission | protocol.read | `apps/his-api/src/modules/protocolVersions/routes.ts:69` |
| PATCH | `/protocol-versions/:versionId` | requirePermission | protocol.write | `apps/his-api/src/modules/protocolVersions/routes.ts:87` |
| POST | `/protocol-versions/:versionId/publish` | requirePermission | protocol.publish | `apps/his-api/src/modules/protocolPublish/routes.ts:23` |
| GET | `/protocols/` | requirePermission | protocol.read | `apps/his-api/src/modules/protocols/routes.ts:188` |
| POST | `/protocols/` | requirePermission | protocol.write | `apps/his-api/src/modules/protocols/routes.ts:22` |
| GET | `/protocols/:id` | requirePermission | protocol.read | `apps/his-api/src/modules/protocols/routes.ts:40` |
| PATCH | `/protocols/:id` | requirePermission | protocol.write | `apps/his-api/src/modules/protocols/routes.ts:58` |
| GET | `/protocols/:id/audit` | requirePermission | protocol.audit.read | `apps/his-api/src/modules/protocols/routes.ts:81` |
| GET | `/protocols/:id/references` | requirePermission | protocol.ref.read | `apps/his-api/src/modules/protocolReferences/routes.ts:52` |
| POST | `/protocols/:id/references` | requirePermission | protocol.ref.write | `apps/his-api/src/modules/protocolReferences/routes.ts:99` |
| DELETE | `/protocols/:id/references/:refId` | requirePermission | protocol.ref.write | `apps/his-api/src/modules/protocolReferences/routes.ts:128` |
| GET | `/protocols/:id/references/suggest` | requirePermission | protocol.ref.read | `apps/his-api/src/modules/protocolReferences/routes.ts:73` |
| GET | `/protocols/:id/versions` | requirePermission | protocol.read | `apps/his-api/src/modules/protocolVersions/routes.ts:50` |
| POST | `/protocols/:id/versions` | requirePermission | protocol.write | `apps/his-api/src/modules/protocolVersions/routes.ts:32` |
| GET | `/rbac/catalog` | requirePermission | rbac.manage | `apps/his-api/src/modules/rbac/routes.ts:32` |
| GET | `/search/` | requirePermission | search.read | `apps/his-api/src/modules/search/routes.ts:8` |
| GET | `/soap-templates` | requirePermission | note.read | `apps/his-api/src/modules/clinicalNotes/routes.ts:183` |
| POST | `/system/ping-job` | requirePermission | system.admin.test | `apps/his-api/src/modules/system/routes.ts:49` |
| GET | `/wards/` | requirePermission | ward.read | `apps/his-api/src/modules/wards/routes.ts:19` |
| POST | `/wards/` | requirePermission | ward.write | `apps/his-api/src/modules/wards/routes.ts:31` |
| PATCH | `/wards/:id` | requirePermission | ward.write | `apps/his-api/src/modules/wards/routes.ts:44` |
