# CALLS WEB Map (his-web)

## Transport/Auth/Base URL

- Base URL resolution: `resolveApiBaseUrl()` -> `resolvePublicApiBaseConfig()` (`apps/his-web/src/lib/api.ts:565`, `apps/his-web/src/lib/publicEnv.ts:67`).
- Browser calls use `fetch(url, { credentials: "same-origin" })` in `apiFetch` (`apps/his-web/src/lib/api.ts:631`).
- JWT token is persisted in HttpOnly cookie via `/api/auth/session` (`apps/his-web/src/lib/auth.ts:51`).
- Proxy injects `Authorization: Bearer <cookie>` (`apps/his-web/src/app/api/proxy/[...path]/route.ts:218`).
- 401 behavior clears local session and redirects to `/login` (`apps/his-web/src/lib/api.ts:659`).

## API Calls (lib/api.ts + lib/auth.ts)

| Source | Function | Method | Path | Definition | Call | Used By (sample) |
|---|---|---|---|---|---|---|
| api.ts | searchGlobal | GET | `/search` | `apps/his-web/src/lib/api.ts:695` | `apps/his-web/src/lib/api.ts:705` | `apps/his-web/src/app/reception/page.tsx:35`<br/>`apps/his-web/src/components/AdmitModal.tsx:101`<br/>`apps/his-web/src/components/SearchBar.tsx:50`<br/>`apps/his-web/src/features/patients/queries.ts:21` |
| api.ts | listOwners | GET | `/owners` | `apps/his-web/src/lib/api.ts:714` | `apps/his-web/src/lib/api.ts:720` | `apps/his-web/src/app/clients/page.tsx:70`<br/>`apps/his-web/src/components/OwnerSearch.tsx:28`<br/>`apps/his-web/src/components/patients/PatientCreateModal.tsx:81` |
| api.ts | createOwner | POST | `/owners` | `apps/his-web/src/lib/api.ts:737` | `apps/his-web/src/lib/api.ts:744` | `apps/his-web/src/app/reception/quick/page.tsx:98`<br/>`apps/his-web/src/components/clients/ClientCreateModal.tsx:64` |
| api.ts | getOwner | GET | `/owners/:param` | `apps/his-web/src/lib/api.ts:759` | `apps/his-web/src/lib/api.ts:760` | `apps/his-web/src/app/reception/start/page.tsx:49` |
| api.ts | listPatients | GET | `/patients` | `apps/his-web/src/lib/api.ts:771` | `apps/his-web/src/lib/api.ts:778` | `apps/his-web/src/app/patients/page.tsx:71` |
| api.ts | createPatient | POST | `/patients` | `apps/his-web/src/lib/api.ts:794` | `apps/his-web/src/lib/api.ts:800` | `apps/his-web/src/app/reception/quick/page.tsx:147`<br/>`apps/his-web/src/components/patients/PatientCreateModal.tsx:136` |
| api.ts | getPatient | GET | `/patients/:param` | `apps/his-web/src/lib/api.ts:814` | `apps/his-web/src/lib/api.ts:815` | `apps/his-web/src/app/inpatient/stays/[id]/page.tsx:160`<br/>`apps/his-web/src/app/reception/start/page.tsx:45` |
| api.ts | getOwnerSummary | GET | `/owners/:param/summary` | `apps/his-web/src/lib/api.ts:826` | `apps/his-web/src/lib/api.ts:827` | `apps/his-web/src/app/clients/[id]/page.tsx:41` |
| api.ts | updateOwner | PATCH | `/owners/:param` | `apps/his-web/src/lib/api.ts:830` | `apps/his-web/src/lib/api.ts:831` | `apps/his-web/src/components/clients/ClientEditModal.tsx:102` |
| api.ts | getPatientSummary | GET | `/patients/:param/summary` | `apps/his-web/src/lib/api.ts:837` | `apps/his-web/src/lib/api.ts:838` | `apps/his-web/src/app/patients/[id]/page.tsx:44`<br/>`apps/his-web/src/app/patients/[id]/record/page.tsx:16`<br/>`apps/his-web/src/features/encounter/queries.ts:56` |
| api.ts | updatePatient | PATCH | `/patients/:param` | `apps/his-web/src/lib/api.ts:841` | `apps/his-web/src/lib/api.ts:842` | `apps/his-web/src/components/patients/PatientEditModal.tsx:133` |
| api.ts | listEncounters | GET | `/encounters` | `apps/his-web/src/lib/api.ts:848` | `apps/his-web/src/lib/api.ts:854` | `apps/his-web/src/app/encounters/page.tsx:53`<br/>`apps/his-web/src/features/record/components/RecordTimeline.tsx:20` |
| api.ts | createEncounter | POST | `/encounters` | `apps/his-web/src/lib/api.ts:857` | `apps/his-web/src/lib/api.ts:858` | `apps/his-web/src/app/patients/[id]/encounters/new/page.tsx:37`<br/>`apps/his-web/src/app/reception/quick/page.tsx:177`<br/>`apps/his-web/src/app/reception/start/page.tsx:67` |
| api.ts | getEncounter | GET | `/encounters/:param` | `apps/his-web/src/lib/api.ts:864` | `apps/his-web/src/lib/api.ts:865` | - |
| api.ts | getEncounterTimeline | GET | `/encounters/:param/timeline` | `apps/his-web/src/lib/api.ts:868` | `apps/his-web/src/lib/api.ts:869` | `apps/his-web/src/features/encounter/queries.ts:43`<br/>`apps/his-web/src/features/record/components/RecordEncounterDetail.tsx:18` |
| api.ts | getSoapTemplates | GET | `/soap-templates` | `apps/his-web/src/lib/api.ts:874` | `apps/his-web/src/lib/api.ts:875` | - |
| api.ts | createClinicalNote | POST | `/encounters/:param/notes` | `apps/his-web/src/lib/api.ts:878` | `apps/his-web/src/lib/api.ts:882` | `apps/his-web/src/features/encounter/queries.ts:85` |
| api.ts | getClinicalNote | GET | `/notes/:param` | `apps/his-web/src/lib/api.ts:888` | `apps/his-web/src/lib/api.ts:889` | - |
| api.ts | updateClinicalNote | PATCH | `/notes/:param` | `apps/his-web/src/lib/api.ts:894` | `apps/his-web/src/lib/api.ts:895` | `apps/his-web/src/features/encounter/queries.ts:102` |
| api.ts | versionClinicalNote | POST | `/notes/:param/version` | `apps/his-web/src/lib/api.ts:901` | `apps/his-web/src/lib/api.ts:908` | `apps/his-web/src/features/encounter/queries.ts:122` |
| api.ts | signClinicalNote | POST | `/notes/:param/sign` | `apps/his-web/src/lib/api.ts:914` | `apps/his-web/src/lib/api.ts:918` | `apps/his-web/src/features/encounter/queries.ts:137` |
| api.ts | createDocument | POST | `/documents` | `apps/his-web/src/lib/api.ts:923` | `apps/his-web/src/lib/api.ts:924` | `apps/his-web/src/features/encounter/components/EncounterMedsTab.tsx:72`<br/>`apps/his-web/src/features/encounter/queries.ts:160` |
| api.ts | attachDocumentToEncounter | POST | `/encounters/:param/documents` | `apps/his-web/src/lib/api.ts:930` | `apps/his-web/src/lib/api.ts:934` | `apps/his-web/src/features/encounter/components/EncounterMedsTab.tsx:79`<br/>`apps/his-web/src/features/encounter/queries.ts:167` |
| api.ts | getWards | GET | `/wards` | `apps/his-web/src/lib/api.ts:940` | `apps/his-web/src/lib/api.ts:947` | `apps/his-web/src/app/inpatient/stays/[id]/page.tsx:179`<br/>`apps/his-web/src/components/BedMap.tsx:104`<br/>`apps/his-web/src/components/HandoverEditor.tsx:350`<br/>`apps/his-web/src/features/inpatientStays/components/InpatientStaysDashboard.tsx:201` |
| api.ts | getBedMap | GET | `/beds/map` | `apps/his-web/src/lib/api.ts:950` | `apps/his-web/src/lib/api.ts:952` | `apps/his-web/src/components/BedMap.tsx:131`<br/>`apps/his-web/src/components/HandoverEditor.tsx:377`<br/>`apps/his-web/src/components/TransferModal.tsx:96`<br/>`apps/his-web/src/features/mar/MarConsole.tsx:47` |
| api.ts | admitInpatient | POST | `/inpatient/admit` | `apps/his-web/src/lib/api.ts:955` | `apps/his-web/src/lib/api.ts:956` | `apps/his-web/src/components/BedMap.tsx:183` |
| api.ts | transferInpatient | POST | `/inpatient/stays/:param/transfer` | `apps/his-web/src/lib/api.ts:962` | `apps/his-web/src/lib/api.ts:966` | `apps/his-web/src/app/inpatient/stays/[id]/page.tsx:217`<br/>`apps/his-web/src/components/BedMap.tsx:204` |
| api.ts | dischargeInpatient | POST | `/inpatient/stays/:param/discharge` | `apps/his-web/src/lib/api.ts:972` | `apps/his-web/src/lib/api.ts:976` | `apps/his-web/src/app/inpatient/stays/[id]/page.tsx:231`<br/>`apps/his-web/src/components/BedMap.tsx:225` |
| api.ts | listInpatientStays | GET | `/inpatient/stays` | `apps/his-web/src/lib/api.ts:989` | `apps/his-web/src/lib/api.ts:1002` | `apps/his-web/src/features/inpatientStays/components/InpatientStaysDashboard.tsx:211`<br/>`apps/his-web/src/features/mar/StaySelector.tsx:53` |
| api.ts | getInpatientStay | GET | `/inpatient/stays/:param` | `apps/his-web/src/lib/api.ts:1007` | `apps/his-web/src/lib/api.ts:1008` | `apps/his-web/src/app/inpatient/stays/[id]/page.tsx:154` |
| api.ts | listMedicationOrders | GET | `/medication-orders` | `apps/his-web/src/lib/api.ts:1013` | `apps/his-web/src/lib/api.ts:1028` | `apps/his-web/src/components/MedOrdersPanel.tsx:136`<br/>`apps/his-web/src/features/encounter/components/EncounterHeader.tsx:34`<br/>`apps/his-web/src/features/encounter/components/EncounterMedsTab.tsx:42`<br/>`apps/his-web/src/features/encounter/components/PrescriptionPrintView.tsx:21` |
| api.ts | createMedicationOrder | POST | `/medication-orders` | `apps/his-web/src/lib/api.ts:1033` | `apps/his-web/src/lib/api.ts:1034` | `apps/his-web/src/components/MedOrdersPanel.tsx:228` |
| api.ts | updateMedicationOrder | PATCH | `/medication-orders/:param` | `apps/his-web/src/lib/api.ts:1040` | `apps/his-web/src/lib/api.ts:1044` | `apps/his-web/src/components/MedOrdersPanel.tsx:249` |
| api.ts | stopMedicationOrder | POST | `/medication-orders/:param/stop` | `apps/his-web/src/lib/api.ts:1050` | `apps/his-web/src/lib/api.ts:1054` | `apps/his-web/src/components/MedOrdersPanel.tsx:271` |
| api.ts | listMedicationAdministrations | GET | `/medication-administrations` | `apps/his-web/src/lib/api.ts:1060` | `apps/his-web/src/lib/api.ts:1073` | `apps/his-web/src/components/MedDueList.tsx:152`<br/>`apps/his-web/src/components/MedOrdersPanel.tsx:195`<br/>`apps/his-web/src/features/inpatient/StayMarPanel.tsx:88` |
| api.ts | createMedicationAdministration | POST | `/medication-administrations` | `apps/his-web/src/lib/api.ts:1081` | `apps/his-web/src/lib/api.ts:1084` | `apps/his-web/src/components/MedDueList.tsx:331`<br/>`apps/his-web/src/components/MedDueList.tsx:373`<br/>`apps/his-web/src/features/inpatient/StayMarPanel.tsx:136` |
| api.ts | getMedicationDueDoses | GET | `/medication-doses/due` | `apps/his-web/src/lib/api.ts:1090` | `apps/his-web/src/lib/api.ts:1099` | `apps/his-web/src/components/MedDueList.tsx:130`<br/>`apps/his-web/src/features/inpatient/StayMarPanel.tsx:69`<br/>`apps/his-web/src/features/mar/useWardMarOverview.ts:37` |
| api.ts | getMedicationLogs | GET | `/medication-logs` | `apps/his-web/src/lib/api.ts:1104` | `apps/his-web/src/lib/api.ts:1106` | `apps/his-web/src/components/MedOrdersPanel.tsx:143`<br/>`apps/his-web/src/features/inpatientStays/components/StayLogsTab.tsx:24` |
| api.ts | getAlerts | GET | `/alerts` | `apps/his-web/src/lib/api.ts:1118` | `apps/his-web/src/lib/api.ts:1133` | `apps/his-web/src/components/AlertsPanel.tsx:54` |
| api.ts | createHandoverDraft | POST | `/handovers/draft` | `apps/his-web/src/lib/api.ts:1236` | `apps/his-web/src/lib/api.ts:1239` | `apps/his-web/src/components/HandoverEditor.tsx:564` |
| api.ts | publishHandover | POST | `/handovers/:param/publish` | `apps/his-web/src/lib/api.ts:1245` | `apps/his-web/src/lib/api.ts:1246` | `apps/his-web/src/components/HandoverEditor.tsx:593` |
| api.ts | getHandoverById | GET | `/handovers/:param` | `apps/his-web/src/lib/api.ts:1251` | `apps/his-web/src/lib/api.ts:1252` | `apps/his-web/src/components/HandoverEditor.tsx:455`<br/>`apps/his-web/src/components/HandoverEditor.tsx:652` |
| api.ts | getLatestHandoverByWard | GET | `/handovers/latest` | `apps/his-web/src/lib/api.ts:1257` | `apps/his-web/src/lib/api.ts:1259` | - |
| api.ts | getHandoverDocument | GET | `/handovers/:param/document` | `apps/his-web/src/lib/api.ts:1264` | `apps/his-web/src/lib/api.ts:1265` | `apps/his-web/src/components/HandoverEditor.tsx:639` |
| api.ts | getAuditEvents | GET | `/audit` | `apps/his-web/src/lib/api.ts:1270` | `apps/his-web/src/lib/api.ts:1283` | `apps/his-web/src/components/HandoverEditor.tsx:416`<br/>`apps/his-web/src/components/MedOrdersPanel.tsx:187` |
| api.ts | listProtocols | GET | `/protocols` | `apps/his-web/src/lib/api.ts:1315` | `apps/his-web/src/lib/api.ts:1328` | `apps/his-web/src/app/protocols/page.tsx:34`<br/>`apps/his-web/src/features/record/components/ProtocolSuggestions.tsx:13` |
| api.ts | getProtocol | GET | `/protocols/:param` | `apps/his-web/src/lib/api.ts:1333` | `apps/his-web/src/lib/api.ts:1334` | - |
| api.ts | createProtocol | POST | `/protocols` | `apps/his-web/src/lib/api.ts:1339` | `apps/his-web/src/lib/api.ts:1340` | - |
| api.ts | updateProtocol | PATCH | `/protocols/:param` | `apps/his-web/src/lib/api.ts:1346` | `apps/his-web/src/lib/api.ts:1347` | - |
| auth.ts | loginWithEmail | POST | `/api/proxy/auth/login` | `apps/his-web/src/lib/auth.ts:120` | `apps/his-web/src/lib/auth.ts:121` | - |
| auth.ts | loginWithKey | POST | `/api/proxy/auth/login` | `apps/his-web/src/lib/auth.ts:156` | `apps/his-web/src/lib/auth.ts:157` | - |
| auth.ts | devLogin | POST | `/api/proxy/auth/dev-login` | `apps/his-web/src/lib/auth.ts:192` | `apps/his-web/src/lib/auth.ts:198` | - |
