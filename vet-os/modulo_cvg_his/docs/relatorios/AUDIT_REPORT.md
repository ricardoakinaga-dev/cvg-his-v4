# HIS Integration Audit Report

**Generated:** 2026-02-20
**Scope:** his-api (Fastify) ↔ his-web (Next.js)

---

## 1. API Route Map (his-api)

### 1.1 Health & System (No Auth Required)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/health` | None | [`health.ts:14`](apps/his-api/src/routes/health.ts:14) |
| GET | `/health/db` | None | [`health.ts:26`](apps/his-api/src/routes/health.ts:26) |
| GET | `/health/redis` | None | [`health.ts:33`](apps/his-api/src/routes/health.ts:33) |
| POST | `/system/ping-job` | `system.admin.test` | [`system/routes.ts:49`](apps/his-api/src/modules/system/routes.ts:49) |

### 1.2 Owners (Prefix: `/owners`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/owners/` | `owner.write` | [`owners/routes.ts:14`](apps/his-api/src/modules/owners/routes.ts:14) |
| GET | `/owners/:id` | `owner.read` | [`owners/routes.ts:27`](apps/his-api/src/modules/owners/routes.ts:27) |
| GET | `/owners/:id/summary` | `owner.read` | [`owners/routes.ts:45`](apps/his-api/src/modules/owners/routes.ts:45) |
| PATCH | `/owners/:id` | `owner.write` | [`owners/routes.ts:62`](apps/his-api/src/modules/owners/routes.ts:62) |
| GET | `/owners/` | `owner.read` | [`owners/routes.ts:81`](apps/his-api/src/modules/owners/routes.ts:81) |

### 1.3 Patients (Prefix: `/patients`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/patients/` | `patient.write` | [`patients/routes.ts:14`](apps/his-api/src/modules/patients/routes.ts:14) |
| GET | `/patients/:id` | `patient.read` | [`patients/routes.ts:32`](apps/his-api/src/modules/patients/routes.ts:32) |
| GET | `/patients/:id/summary` | `patient.read` | [`patients/routes.ts:50`](apps/his-api/src/modules/patients/routes.ts:50) |
| PATCH | `/patients/:id` | `patient.write` | [`patients/routes.ts:67`](apps/his-api/src/modules/patients/routes.ts:67) |
| GET | `/patients/` | `patient.read` | [`patients/routes.ts:90`](apps/his-api/src/modules/patients/routes.ts:90) |

### 1.4 Encounters (Prefix: `/encounters`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/encounters/` | `encounter.write` | [`encounters/routes.ts:23`](apps/his-api/src/modules/encounters/routes.ts:23) |
| GET | `/encounters/:id` | `encounter.read` | [`encounters/routes.ts:41`](apps/his-api/src/modules/encounters/routes.ts:41) |
| GET | `/encounters/:id/timeline` | `timeline.read` | [`encounters/routes.ts:59`](apps/his-api/src/modules/encounters/routes.ts:59) |
| GET | `/encounters/` | `encounter.read` | [`encounters/routes.ts:77`](apps/his-api/src/modules/encounters/routes.ts:77) |
| POST | `/encounters/:id/close` | `encounter.close` | [`encounters/routes.ts:89`](apps/his-api/src/modules/encounters/routes.ts:89) |

### 1.5 Clinical Notes (No Prefix - Mixed Paths)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/encounters/:id/notes` | `note.write` | [`clinicalNotes/routes.ts:33`](apps/his-api/src/modules/clinicalNotes/routes.ts:33) |
| PATCH | `/notes/:id` | `note.write` | [`clinicalNotes/routes.ts:60`](apps/his-api/src/modules/clinicalNotes/routes.ts:60) |
| POST | `/notes/:id/version` | `note.version` | [`clinicalNotes/routes.ts:96`](apps/his-api/src/modules/clinicalNotes/routes.ts:96) |
| POST | `/notes/:id/sign` | `note.sign` | [`clinicalNotes/routes.ts:135`](apps/his-api/src/modules/clinicalNotes/routes.ts:135) |
| GET | `/notes/:id` | `note.read` | [`clinicalNotes/routes.ts:165`](apps/his-api/src/modules/clinicalNotes/routes.ts:165) |
| GET | `/soap-templates` | `note.read` | [`clinicalNotes/routes.ts:183`](apps/his-api/src/modules/clinicalNotes/routes.ts:183) |

### 1.6 Documents (No Prefix - Mixed Paths)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/documents` | `document.write` | [`documents/routes.ts:21`](apps/his-api/src/modules/documents/routes.ts:21) |
| POST | `/encounters/:id/documents` | `document.write` | [`documents/routes.ts:34`](apps/his-api/src/modules/documents/routes.ts:34) |
| GET | `/documents/:id` | `document.read` | [`documents/routes.ts:60`](apps/his-api/src/modules/documents/routes.ts:60) |

### 1.7 Wards (Prefix: `/wards`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/wards/` | `ward.read` | [`wards/routes.ts:19`](apps/his-api/src/modules/wards/routes.ts:19) |
| POST | `/wards/` | `ward.write` | [`wards/routes.ts:31`](apps/his-api/src/modules/wards/routes.ts:31) |
| PATCH | `/wards/:id` | `ward.write` | [`wards/routes.ts:44`](apps/his-api/src/modules/wards/routes.ts:44) |

### 1.8 Beds (Prefix: `/beds`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/beds/` | `bed.read` | [`beds/routes.ts:20`](apps/his-api/src/modules/beds/routes.ts:20) |
| POST | `/beds/` | `bed.write` | [`beds/routes.ts:32`](apps/his-api/src/modules/beds/routes.ts:32) |
| PATCH | `/beds/:id` | `bed.write` | [`beds/routes.ts:50`](apps/his-api/src/modules/beds/routes.ts:50) |
| GET | `/beds/map` | `bedmap.read` | [`bedmap/routes.ts:12`](apps/his-api/src/modules/bedmap/routes.ts:12) |

### 1.9 Inpatient (Prefix: `/inpatient`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/inpatient/admit` | `inpatient.write` | [`inpatient/routes.ts:26`](apps/his-api/src/modules/inpatient/routes.ts:26) |
| POST | `/inpatient/stays/:id/transfer` | `inpatient.write` | [`inpatient/routes.ts:64`](apps/his-api/src/modules/inpatient/routes.ts:64) |
| POST | `/inpatient/stays/:id/discharge` | `inpatient.discharge` | [`inpatient/routes.ts:110`](apps/his-api/src/modules/inpatient/routes.ts:110) |
| GET | `/inpatient/stays/:id` | `inpatient.read` | [`inpatient/routes.ts:136`](apps/his-api/src/modules/inpatient/routes.ts:136) |
| GET | `/inpatient/stays` | `inpatient.read` | [`inpatient/routes.ts:154`](apps/his-api/src/modules/inpatient/routes.ts:154) |

### 1.10 Medication Orders (Prefix: `/medication-orders`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/medication-orders/` | `medorder.write` | [`medicationOrders/routes.ts:17`](apps/his-api/src/modules/medicationOrders/routes.ts:17) |
| GET | `/medication-orders/:id` | `medorder.read` | [`medicationOrders/routes.ts:47`](apps/his-api/src/modules/medicationOrders/routes.ts:47) |
| GET | `/medication-orders/` | `medorder.read` | [`medicationOrders/routes.ts:65`](apps/his-api/src/modules/medicationOrders/routes.ts:65) |
| PATCH | `/medication-orders/:id` | `medorder.write` | [`medicationOrders/routes.ts:77`](apps/his-api/src/modules/medicationOrders/routes.ts:77) |
| POST | `/medication-orders/:id/stop` | `medorder.stop` | [`medicationOrders/routes.ts:103`](apps/his-api/src/modules/medicationOrders/routes.ts:103) |
| POST | `/medication-orders/:id/schedule` | `medorder.write` | [`medicationSchedules/routes.ts:22`](apps/his-api/src/modules/medicationSchedules/routes.ts:22) |
| PATCH | `/medication-orders/:id/schedule` | `medorder.write` | [`medicationSchedules/routes.ts:57`](apps/his-api/src/modules/medicationSchedules/routes.ts:57) |

### 1.11 Medication Administrations (Prefix: `/medication-administrations`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/medication-administrations/` | `medadmin.write` | [`medicationAdministrations/routes.ts:16`](apps/his-api/src/modules/medicationAdministrations/routes.ts:16) |
| GET | `/medication-administrations/` | `medadmin.read` | [`medicationAdministrations/routes.ts:63`](apps/his-api/src/modules/medicationAdministrations/routes.ts:63) |

### 1.12 Medication Doses (Prefix: `/medication-doses`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/medication-doses/due` | `medorder.read` + `medadmin.read` | [`medicationDoses/routes.ts:13`](apps/his-api/src/modules/medicationDoses/routes.ts:13) |

### 1.13 Medication Logs (Prefix: `/medication-logs`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/medication-logs/` | `medlog.read` | [`medicationLogs/routes.ts:8`](apps/his-api/src/modules/medicationLogs/routes.ts:8) |

### 1.14 Handovers (Prefix: `/handovers`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/handovers/draft` | `handover.write` | [`handovers/routes.ts:28`](apps/his-api/src/modules/handovers/routes.ts:28) |
| POST | `/handovers/:id/publish` | `handover.publish` | [`handovers/routes.ts:58`](apps/his-api/src/modules/handovers/routes.ts:58) |
| GET | `/handovers/latest` | `handover.read` | [`handovers/routes.ts:93`](apps/his-api/src/modules/handovers/routes.ts:93) |
| GET | `/handovers/:id` | `handover.read` | [`handovers/routes.ts:113`](apps/his-api/src/modules/handovers/routes.ts:113) |
| GET | `/handovers/:id/document` | `handover.read` | [`handovers/routes.ts:131`](apps/his-api/src/modules/handovers/routes.ts:131) |

### 1.15 Alerts (Prefix: `/alerts`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/alerts/` | `alerts.read` | [`alerts/routes.ts:31`](apps/his-api/src/modules/alerts/routes.ts:31) |
| POST | `/alerts/scan` | `system.admin.test` | [`alerts/routes.ts:43`](apps/his-api/src/modules/alerts/routes.ts:43) |

### 1.16 Audit (No Prefix)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/audit` | `audit.read` | [`audit/routes.ts:15`](apps/his-api/src/modules/audit/routes.ts:15) |
| POST | `/admin/audit-test` | `system.admin.test` | [`audit/routes.ts:87`](apps/his-api/src/modules/audit/routes.ts:87) |

### 1.17 RBAC (No Prefix)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/admin/test` | `system.admin.test` | [`rbac/routes.ts:8`](apps/his-api/src/modules/rbac/routes.ts:8) |
| GET | `/audit/test` | `audit.read` | [`rbac/routes.ts:20`](apps/his-api/src/modules/rbac/routes.ts:20) |
| GET | `/rbac/catalog` | `rbac.manage` | [`rbac/routes.ts:32`](apps/his-api/src/modules/rbac/routes.ts:32) |

### 1.18 Search (Prefix: `/search`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/search/` | `search.read` | [`search/routes.ts:8`](apps/his-api/src/modules/search/routes.ts:8) |

### 1.19 Patient Context (Prefix: `/patient-context`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/patient-context/by-patient/:patientId` | `patient.read` | [`patientContext/routes.ts:19`](apps/his-api/src/modules/patientContext/routes.ts:19) |
| GET | `/patient-context/by-stay/:stayId` | `patient.read` | [`patientContext/routes.ts:45`](apps/his-api/src/modules/patientContext/routes.ts:45) |
| GET | `/patient-context/:patientId/info` | `patient.read` | [`patientContext/routes.ts:71`](apps/his-api/src/modules/patientContext/routes.ts:71) |
| GET | `/patient-context/stay/:stayId` | `patient.read` | [`patientContext/routes.ts:97`](apps/his-api/src/modules/patientContext/routes.ts:97) |

### 1.20 Protocols (Prefix: `/protocols`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/protocols/` | `protocol.write` | [`protocols/routes.ts:22`](apps/his-api/src/modules/protocols/routes.ts:22) |
| GET | `/protocols/:id` | `protocol.read` | [`protocols/routes.ts:40`](apps/his-api/src/modules/protocols/routes.ts:40) |
| PATCH | `/protocols/:id` | `protocol.write` | [`protocols/routes.ts:58`](apps/his-api/src/modules/protocols/routes.ts:58) |
| GET | `/protocols/:id/audit` | `protocol.audit.read` | [`protocols/routes.ts:81`](apps/his-api/src/modules/protocols/routes.ts:81) |
| GET | `/protocols/` | `protocol.read` | [`protocols/routes.ts:188`](apps/his-api/src/modules/protocols/routes.ts:188) |

### 1.21 Protocol Versions (No Prefix - Mixed)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/protocols/:id/versions` | `protocol.write` | [`protocolVersions/routes.ts:32`](apps/his-api/src/modules/protocolVersions/routes.ts:32) |
| GET | `/protocols/:id/versions` | `protocol.read` | [`protocolVersions/routes.ts:50`](apps/his-api/src/modules/protocolVersions/routes.ts:50) |
| GET | `/protocol-versions/:versionId` | `protocol.read` | [`protocolVersions/routes.ts:69`](apps/his-api/src/modules/protocolVersions/routes.ts:69) |
| PATCH | `/protocol-versions/:versionId` | `protocol.write` | [`protocolVersions/routes.ts:87`](apps/his-api/src/modules/protocolVersions/routes.ts:87) |

### 1.22 Protocol Diff (No Prefix)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/protocol-versions/:a/diff/:b` | `protocol.diff.read` | [`protocolDiff/routes.ts:13`](apps/his-api/src/modules/protocolDiff/routes.ts:13) |

### 1.23 Protocol Publish (No Prefix)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| POST | `/protocol-versions/:versionId/publish` | `protocol.publish` | [`protocolPublish/routes.ts:23`](apps/his-api/src/modules/protocolPublish/routes.ts:23) |

### 1.24 Protocol References (Prefix: `/protocols`)

| Method | Path | Permission | File:Line |
|--------|------|------------|-----------|
| GET | `/protocols/:id/references` | `protocol.ref.read` | [`protocolReferences/routes.ts:52`](apps/his-api/src/modules/protocolReferences/routes.ts:52) |
| GET | `/protocols/:id/references/suggest` | `protocol.ref.read` | [`protocolReferences/routes.ts:73`](apps/his-api/src/modules/protocolReferences/routes.ts:73) |
| POST | `/protocols/:id/references` | `protocol.ref.write` | [`protocolReferences/routes.ts:99`](apps/his-api/src/modules/protocolReferences/routes.ts:99) |
| DELETE | `/protocols/:id/references/:refId` | `protocol.ref.write` | [`protocolReferences/routes.ts:128`](apps/his-api/src/modules/protocolReferences/routes.ts:128) |

---

## 2. Frontend API Call Map (his-web)

### 2.1 API Client Configuration

**Base URL Resolution** ([`lib/publicEnv.ts`](apps/his-web/src/lib/publicEnv.ts)):
- Primary: `NEXT_PUBLIC_HIS_API_BASE_URL` (build-time env)
- Default: `/api/proxy` (same-origin proxy)

**Proxy Configuration** ([`app/api/proxy/[...path]/route.ts`](apps/his-web/src/app/api/proxy/[...path]/route.ts)):
- Upstream: `HIS_API_INTERNAL_URL` or `HIS_API_BASE_URL` (server-side env)
- Default upstream: `http://127.0.0.1:3000`

**Auth Headers** ([`lib/api.ts:609-632`](apps/his-web/src/lib/api.ts:609)):
```typescript
headers.set('x-request-id', requestId);
headers.set('x-account-id', session.accountId);
headers.set('x-role', session.role);
headers.set('x-unit-id', session.unitId);
headers.set('x-user-id', session.userId);
```

### 2.2 API Functions by Feature

#### Search
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `searchGlobal()` | GET | `/search` | [`api.ts:707`](apps/his-web/src/lib/api.ts:707) |

#### Owners (Clients)
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `listOwners()` | GET | `/owners` | [`api.ts:726`](apps/his-web/src/lib/api.ts:726) |
| `createOwner()` | POST | `/owners` | [`api.ts:749`](apps/his-web/src/lib/api.ts:749) |
| `getOwner()` | GET | `/owners/:id` | [`api.ts:771`](apps/his-web/src/lib/api.ts:771) |
| `getOwnerSummary()` | GET | `/owners/:id/summary` | [`api.ts:838`](apps/his-web/src/lib/api.ts:838) |
| `updateOwner()` | PATCH | `/owners/:id` | [`api.ts:842`](apps/his-web/src/lib/api.ts:842) |

#### Patients (Animals)
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `listPatients()` | GET | `/patients` | [`api.ts:783`](apps/his-web/src/lib/api.ts:783) |
| `createPatient()` | POST | `/patients` | [`api.ts:806`](apps/his-web/src/lib/api.ts:806) |
| `getPatient()` | GET | `/patients/:id` | [`api.ts:826`](apps/his-web/src/lib/api.ts:826) |
| `getPatientSummary()` | GET | `/patients/:id/summary` | [`api.ts:849`](apps/his-web/src/lib/api.ts:849) |
| `updatePatient()` | PATCH | `/patients/:id` | [`api.ts:853`](apps/his-web/src/lib/api.ts:853) |

#### Encounters
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `listEncounters()` | GET | `/encounters` | [`api.ts:860`](apps/his-web/src/lib/api.ts:860) |
| `createEncounter()` | POST | `/encounters` | [`api.ts:869`](apps/his-web/src/lib/api.ts:869) |
| `getEncounter()` | GET | `/encounters/:id` | [`api.ts:876`](apps/his-web/src/lib/api.ts:876) |
| `getEncounterTimeline()` | GET | `/encounters/:id/timeline` | [`api.ts:880`](apps/his-web/src/lib/api.ts:880) |

#### Clinical Notes
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `getSoapTemplates()` | GET | `/soap-templates` | [`api.ts:886`](apps/his-web/src/lib/api.ts:886) |
| `createClinicalNote()` | POST | `/encounters/:id/notes` | [`api.ts:890`](apps/his-web/src/lib/api.ts:890) |
| `getClinicalNote()` | GET | `/notes/:id` | [`api.ts:900`](apps/his-web/src/lib/api.ts:900) |
| `updateClinicalNote()` | PATCH | `/notes/:id` | [`api.ts:906`](apps/his-web/src/lib/api.ts:906) |
| `versionClinicalNote()` | POST | `/notes/:id/version` | [`api.ts:913`](apps/his-web/src/lib/api.ts:913) |
| `signClinicalNote()` | POST | `/notes/:id/sign` | [`api.ts:926`](apps/his-web/src/lib/api.ts:926) |

#### Documents
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `createDocument()` | POST | `/documents` | [`api.ts:935`](apps/his-web/src/lib/api.ts:935) |
| `attachDocumentToEncounter()` | POST | `/encounters/:id/documents` | [`api.ts:942`](apps/his-web/src/lib/api.ts:942) |

#### Wards & Beds
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `getWards()` | GET | `/wards` | [`api.ts:952`](apps/his-web/src/lib/api.ts:952) |
| `getBedMap()` | GET | `/beds/map` | [`api.ts:962`](apps/his-web/src/lib/api.ts:962) |

#### Inpatient
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `admitInpatient()` | POST | `/inpatient/admit` | [`api.ts:967`](apps/his-web/src/lib/api.ts:967) |
| `transferInpatient()` | POST | `/inpatient/stays/:id/transfer` | [`api.ts:974`](apps/his-web/src/lib/api.ts:974) |
| `dischargeInpatient()` | POST | `/inpatient/stays/:id/discharge` | [`api.ts:984`](apps/his-web/src/lib/api.ts:984) |
| `listInpatientStays()` | GET | `/inpatient/stays` | [`api.ts:1001`](apps/his-web/src/lib/api.ts:1001) |

#### Medication Orders
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `listMedicationOrders()` | GET | `/medication-orders` | [`api.ts:1019`](apps/his-web/src/lib/api.ts:1019) |
| `createMedicationOrder()` | POST | `/medication-orders` | [`api.ts:1039`](apps/his-web/src/lib/api.ts:1039) |
| `updateMedicationOrder()` | PATCH | `/medication-orders/:id` | [`api.ts:1046`](apps/his-web/src/lib/api.ts:1046) |
| `stopMedicationOrder()` | POST | `/medication-orders/:id/stop` | [`api.ts:1056`](apps/his-web/src/lib/api.ts:1056) |

#### Medication Administrations
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `listMedicationAdministrations()` | GET | `/medication-administrations` | [`api.ts:1066`](apps/his-web/src/lib/api.ts:1066) |
| `createMedicationAdministration()` | POST | `/medication-administrations` | [`api.ts:1087`](apps/his-web/src/lib/api.ts:1087) |

#### Medication Doses & Logs
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `getMedicationDueDoses()` | GET | `/medication-doses/due` | [`api.ts:1096`](apps/his-web/src/lib/api.ts:1096) |
| `getMedicationLogs()` | GET | `/medication-logs` | [`api.ts:1110`](apps/his-web/src/lib/api.ts:1110) |

#### Alerts
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `getAlerts()` | GET | `/alerts` | [`api.ts:1124`](apps/his-web/src/lib/api.ts:1124) |

#### Handovers
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `createHandoverDraft()` | POST | `/handovers/draft` | [`api.ts:1242`](apps/his-web/src/lib/api.ts:1242) |
| `publishHandover()` | POST | `/handovers/:id/publish` | [`api.ts:1251`](apps/his-web/src/lib/api.ts:1251) |
| `getHandoverById()` | GET | `/handovers/:id` | [`api.ts:1257`](apps/his-web/src/lib/api.ts:1257) |
| `getLatestHandoverByWard()` | GET | `/handovers/latest` | [`api.ts:1263`](apps/his-web/src/lib/api.ts:1263) |
| `getHandoverDocument()` | GET | `/handovers/:id/document` | [`api.ts:1270`](apps/his-web/src/lib/api.ts:1270) |

#### Audit
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `getAuditEvents()` | GET | `/audit` | [`api.ts:1276`](apps/his-web/src/lib/api.ts:1276) |

#### Patient Context
| Function | Method | Endpoint | File:Line |
|----------|--------|----------|-----------|
| `getPatientContext()` | GET | `/patient-context/by-patient/:patientId` | [`patientContext/api.ts:7`](apps/his-web/src/features/patientContext/api.ts:7) |
| `getPatientContextByStay()` | GET | `/patient-context/by-stay/:stayId` | [`patientContext/api.ts:16`](apps/his-web/src/features/patientContext/api.ts:16) |
| `getPatientInfo()` | GET | `/patient-context/:patientId/info` | [`patientContext/api.ts:25`](apps/his-web/src/features/patientContext/api.ts:25) |
| `getStayInfo()` | GET | `/patient-context/stay/:stayId` | [`patientContext/api.ts:34`](apps/his-web/src/features/patientContext/api.ts:34) |

---

## 3. Divergence Report

### 3.1 Routes Called by Web but NOT in API (P0 - Critical)

| Endpoint | Source | Issue |
|----------|--------|-------|
| None found | - | All web calls have corresponding API routes |

### 3.2 API Routes NOT Consumed by Web (P2 - Informational)

| Endpoint | Permission | Notes |
|----------|------------|-------|
| `/protocols/:id/references` | `protocol.ref.read` | Protocol references feature not implemented in UI |
| `/protocols/:id/references/suggest` | `protocol.ref.read` | Qdrant integration not exposed |
| `/rbac/catalog` | `rbac.manage` | RBAC management UI missing |
| `/admin/test` | `system.admin.test` | Admin test endpoint not used |
| `/audit/test` | `audit.read` | Audit test endpoint not used |
| `/alerts/scan` | `system.admin.test` | Manual alert scan not exposed |
| `/admin/audit-test` | `system.admin.test` | Test endpoint not used |

### 3.3 Contract Inconsistencies (P1 - High)

#### 3.3.1 Missing `/patient-context` in Proxy Allowlist

**Issue:** The `/patient-context` routes are NOT in the proxy allowlist.

**Location:** [`app/api/proxy/[...path]/route.ts:7-30`](apps/his-web/src/app/api/proxy/[...path]/route.ts:7)

**Current allowlist:**
```typescript
const ALLOWED_PATH_PREFIXES = [
  '/owners', '/patients', '/search', '/encounters', '/notes',
  '/documents', '/wards', '/beds', '/inpatient', '/medication-orders',
  '/medication-administrations', '/medication-doses', '/medication-logs',
  '/handovers', '/protocols', '/protocol-diff', '/protocol-versions',
  '/audit', '/alerts', '/rbac', '/system', '/soap-templates'
] as const;
```

**Missing:** `/patient-context`

**Impact:** All patient context API calls will return 403 Forbidden from proxy.

#### 3.3.2 Auth Headers Trust Issue (Security)

**Issue:** Frontend sends `x-account-id`, `x-role`, `x-unit-id`, `x-user-id` headers from localStorage session.

**Location:** [`lib/api.ts:618-632`](apps/his-web/src/lib/api.ts:618)

**Problem:** These headers are client-controlled and could be manipulated. The backend should derive actor context ONLY from the verified JWT token.

**Backend behavior:** [`modules/auth/service.ts:162-213`](apps/his-api/src/modules/auth/service.ts:162) - The backend correctly derives actor from JWT claims, but the extra headers are still sent and could cause confusion.

**Recommendation:** Remove client-controlled context headers from frontend. Rely solely on `Authorization: Bearer <token>`.

#### 3.3.3 Missing Token in API Requests

**Issue:** `getAuthToken()` returns `null` always.

**Location:** [`lib/auth.ts:97-99`](apps/his-web/src/lib/auth.ts:97)

```typescript
export function getAuthToken(): string | null {
  return null;
}
```

**Impact:** The `Authorization` header is never set directly by `apiFetch()`. The proxy route extracts token from cookie and sets it.

**This is actually correct behavior** - the proxy handles token injection from cookie.

### 3.4 CORS & Mixed Content Issues (P1)

#### 3.4.1 CORS Configuration

**Location:** [`server.ts:30-32`](apps/his-api/src/server.ts:30)

```typescript
await app.register(cors, {
  origin: app.env.NODE_ENV === 'development'
});
```

**Issue:** CORS only enabled in development. In production, the proxy approach is required.

**Recommendation:** This is correct for the proxy architecture. No change needed if using `/api/proxy`.

#### 3.4.2 Build-time vs Runtime Env

**Issue:** `NEXT_PUBLIC_HIS_API_BASE_URL` is a build-time environment variable.

**Location:** [`lib/publicEnv.ts:25`](apps/his-web/src/lib/publicEnv.ts:25)

**Impact:** Changing this value requires a rebuild of the web application.

**Recommendation:** Document clearly in deploy checklist. Default `/api/proxy` works without changes.

### 3.5 Missing Features in UI (P2)

| Feature | API Ready | UI Page | Status |
|---------|-----------|---------|--------|
| Clients (Owners) | ✅ | `/clients` | ✅ Implemented |
| Patients (Animals) | ✅ | `/patients` | ✅ Implemented |
| Patient Context | ✅ | Integrated | ✅ Implemented |
| Encounters | ✅ | `/encounters` | ✅ Implemented |
| Inpatient Stays | ✅ | `/inpatient/stays` | ✅ Implemented |
| Bed Map | ✅ | `/inpatient/bedmap` | ✅ Implemented |
| MAR Console | ✅ | `/inpatient/mar` | ✅ Implemented |
| Handovers | ✅ | `/inpatient/handovers` | ✅ Implemented |
| Protocols | ✅ | Missing page | ❌ No `/protocols` page |
| Protocol Versions | ✅ | Missing | ❌ Not implemented |
| Protocol References | ✅ | Missing | ❌ Not implemented |
| RBAC Management | ✅ | Missing | ❌ Not implemented |

---

## 4. Bug Severity Classification

### P0 - Critical (Blocking)

| ID | Issue | Impact | Fix |
|----|-------|--------|-----|
| P0-1 | `/patient-context` not in proxy allowlist | 403 on all patient context calls | Add to allowlist |

### P1 - High (Should Fix)

| ID | Issue | Impact | Fix |
|----|-------|--------|-----|
| P1-1 | Client-controlled context headers | Security risk, confusion | Remove headers, rely on JWT only |
| P1-2 | Missing `/protocols` UI page | Feature incomplete | Create protocols list page |

### P2 - Medium (Nice to Have)

| ID | Issue | Impact | Fix |
|----|-------|--------|-----|
| P2-1 | Protocol references not exposed | Feature unused | Add UI or document as internal |
| P2-2 | RBAC management UI missing | Admin feature incomplete | Create RBAC management page |

---

## 5. Integration Map

| Feature | Web Route | API Calls | Required Permissions | DTO Schema |
|---------|-----------|-----------|---------------------|------------|
| **Clients** | `/clients` | `GET /owners`, `POST /owners`, `GET /owners/:id`, `PATCH /owners/:id`, `GET /owners/:id/summary` | `owner.read`, `owner.write` | `OwnerCreateSchema`, `OwnerReadSchema` |
| **Patients** | `/patients` | `GET /patients`, `POST /patients`, `GET /patients/:id`, `PATCH /patients/:id`, `GET /patients/:id/summary` | `patient.read`, `patient.write` | `PatientCreateSchema`, `PatientReadSchema` |
| **Patient Context** | Integrated | `GET /patient-context/by-patient/:id`, `GET /patient-context/by-stay/:id` | `patient.read` | `PatientContextResponse` |
| **Encounters** | `/encounters` | `GET /encounters`, `POST /encounters`, `GET /encounters/:id`, `GET /encounters/:id/timeline`, `POST /encounters/:id/close` | `encounter.read`, `encounter.write`, `encounter.close`, `timeline.read` | `EncounterCreateSchema`, `EncounterReadSchema` |
| **Clinical Notes** | `/encounters/:id` | `GET /notes/:id`, `POST /encounters/:id/notes`, `PATCH /notes/:id`, `POST /notes/:id/version`, `POST /notes/:id/sign`, `GET /soap-templates` | `note.read`, `note.write`, `note.version`, `note.sign` | `NoteCreateSchema`, `NoteUpdateSchema` |
| **Documents** | Integrated | `POST /documents`, `POST /encounters/:id/documents`, `GET /documents/:id` | `document.read`, `document.write` | `DocumentCreateSchema` |
| **Bed Map** | `/inpatient/bedmap` | `GET /wards`, `GET /beds/map` | `ward.read`, `bedmap.read` | `WardListResponse`, `BedMapResponse` |
| **Inpatient Stays** | `/inpatient/stays` | `GET /inpatient/stays`, `POST /inpatient/admit`, `POST /inpatient/stays/:id/transfer`, `POST /inpatient/stays/:id/discharge` | `inpatient.read`, `inpatient.write`, `inpatient.discharge` | `InpatientAdmitSchema`, `InpatientTransferSchema`, `InpatientDischargeSchema` |
| **MAR** | `/inpatient/mar` | `GET /medication-orders`, `GET /medication-administrations`, `POST /medication-administrations`, `GET /medication-doses/due`, `GET /medication-logs` | `medorder.read`, `medadmin.read`, `medadmin.write`, `medlog.read` | `MedicationOrderCreateSchema`, `MedicationAdministrationCreateSchema` |
| **Handovers** | `/inpatient/handovers` | `POST /handovers/draft`, `POST /handovers/:id/publish`, `GET /handovers/:id`, `GET /handovers/latest`, `GET /handovers/:id/document` | `handover.read`, `handover.write`, `handover.publish` | `HandoverDraftSchema`, `HandoverPublishSchema` |
| **Alerts** | Integrated | `GET /alerts` | `alerts.read` | `ClinicalAlertSchema` |
| **Audit** | Integrated | `GET /audit` | `audit.read` | `AuditEventsResponse` |
| **Search** | Global | `GET /search` | `search.read` | `SearchResponse` |
| **Protocols** | Missing | `GET /protocols`, `POST /protocols`, `GET /protocols/:id` | `protocol.read`, `protocol.write` | `ProtocolCreateSchema`, `ProtocolUpdateSchema` |

---

## 6. Next Steps

1. **PR-A:** Fix proxy allowlist (add `/patient-context`)
2. **PR-B:** Remove client-controlled headers, document auth flow
3. **PR-C:** Add missing `/protocols` UI page
4. **PR-D:** Deploy checklist documentation
