{{- /*
cvg-his-v2 - Helm helpers
*/ -}}
{{- define "cvg-his-v2.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cvg-his-v2.api.fullname" -}}
{{- printf "%s-api" (include "cvg-his-v2.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cvg-his-v2.worker.fullname" -}}
{{- printf "%s-worker" (include "cvg-his-v2.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cvg-his-v2.spa.fullname" -}}
{{- printf "%s-spa" (include "cvg-his-v2.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cvg-his-v2.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: {{ .Release.Name }}
heroku.com/code-org: cvg-his
{{- end }}

{{- define "cvg-his-v2.api.labels" -}}
{{- include "cvg-his-v2.labels" . }}
app.kubernetes.io/component: api
{{- end }}

{{- define "cvg-his-v2.worker.labels" -}}
{{- include "cvg-his-v2.labels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{- define "cvg-his-v2.spa.labels" -}}
{{- include "cvg-his-v2.labels" . }}
app.kubernetes.io/component: spa
{{- end }}

{{- define "cvg-his-v2.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "cvg-his-v2.api.selectorLabels" -}}
{{- include "cvg-his-v2.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{- define "cvg-his-v2.worker.selectorLabels" -}}
{{- include "cvg-his-v2.selectorLabels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{- define "cvg-his-v2.spa.selectorLabels" -}}
{{- include "cvg-his-v2.selectorLabels" . }}
app.kubernetes.io/component: spa
{{- end }}

{{- define "cvg-his-v2.postgres.secretName" -}}
{{- default (printf "%s-postgres" (include "cvg-his-v2.fullname" .)) .Values.postgresql.existingSecret }}
{{- end }}

{{- define "cvg-his-v2.redis.secretName" -}}
{{- default (printf "%s-redis" (include "cvg-his-v2.fullname" .)) .Values.redis.existingSecret }}
{{- end }}

{{- define "cvg-his-v2.postgresql.image" -}}
{{- $registry := .Values.postgresql.image.registry | default "docker.io" -}}
{{- $repository := required "postgresql.image.repository is required" .Values.postgresql.image.repository -}}
{{- $sha := required "postgresql.image.sha is required for embedded datastore image immutability" .Values.postgresql.image.sha -}}
{{- if not (regexMatch "^sha256:[a-f0-9]{64}$" $sha) -}}{{- fail "postgresql.image.sha must match sha256:<64 lowercase hex characters>" -}}{{- end -}}
{{- printf "%s/%s@%s" $registry $repository $sha -}}
{{- end }}

{{- define "cvg-his-v2.redis.image" -}}
{{- $registry := .Values.redis.image.registry | default "docker.io" -}}
{{- $repository := required "redis.image.repository is required" .Values.redis.image.repository -}}
{{- $sha := required "redis.image.sha is required for embedded datastore image immutability" .Values.redis.image.sha -}}
{{- if not (regexMatch "^sha256:[a-f0-9]{64}$" $sha) -}}{{- fail "redis.image.sha must match sha256:<64 lowercase hex characters>" -}}{{- end -}}
{{- printf "%s/%s@%s" $registry $repository $sha -}}
{{- end }}

{{- define "cvg-his-v2.api.secretName" -}}
{{- default (printf "%s-api" (include "cvg-his-v2.fullname" .)) .Values.api.auth.existingSecret }}
{{- end }}

{{- define "cvg-his-v2.api.setupSecretName" -}}
{{- default (printf "%s-api-setup" (include "cvg-his-v2.fullname" .)) .Values.api.setup.existingSecret }}
{{- end }}

{{- define "cvg-his-v2.api.configmapName" -}}
{{- printf "%s-api-config" (include "cvg-his-v2.fullname" .) }}
{{- end }}

{{- define "cvg-his-v2.worker.configmapName" -}}
{{- printf "%s-worker-config" (include "cvg-his-v2.fullname" .) }}
{{- end }}

{{- define "cvg-his-v2.worker.accountIdsSecretName" -}}
{{- default (printf "%s-worker-accounts" (include "cvg-his-v2.fullname" .)) .Values.worker.accountIds.existingSecret }}
{{- end }}

{{- define "cvg-his-v2.worker.reportsUserSecretName" -}}
{{- default (printf "%s-worker-reports" (include "cvg-his-v2.fullname" .)) .Values.worker.reportsUser.existingSecret }}
{{- end }}

{{- define "cvg-his-v2.spa.configmapName" -}}
{{- printf "%s-spa-config" (include "cvg-his-v2.fullname" .) }}
{{- end }}

{{- define "cvg-his-v2.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "cvg-his-v2.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end }}

{{- define "cvg-his-v2.api.image" -}}
{{- if eq .Values.global.environment "production" -}}
{{- $sha := required "api.image.sha is required for production image immutability" .Values.api.image.sha -}}
{{- if not (regexMatch "^sha256:[a-f0-9]{64}$" $sha) -}}{{- fail "api.image.sha must match sha256:<64 lowercase hex characters>" -}}{{- end -}}
{{- printf "%s/%s@%s" .Values.api.image.registry .Values.api.image.repository $sha -}}
{{- else if .Values.api.image.sha -}}
{{- printf "%s/%s@%s" .Values.api.image.registry .Values.api.image.repository .Values.api.image.sha -}}
{{- else -}}
{{- printf "%s/%s:%s" .Values.api.image.registry .Values.api.image.repository (.Values.api.image.tag | default .Chart.AppVersion) -}}
{{- end -}}
{{- end }}

{{- define "cvg-his-v2.worker.image" -}}
{{- if eq .Values.global.environment "production" -}}
{{- $sha := required "worker.image.sha is required for production image immutability" .Values.worker.image.sha -}}
{{- if not (regexMatch "^sha256:[a-f0-9]{64}$" $sha) -}}{{- fail "worker.image.sha must match sha256:<64 lowercase hex characters>" -}}{{- end -}}
{{- printf "%s/%s@%s" .Values.worker.image.registry .Values.worker.image.repository $sha -}}
{{- else if .Values.worker.image.sha -}}
{{- printf "%s/%s@%s" .Values.worker.image.registry .Values.worker.image.repository .Values.worker.image.sha -}}
{{- else -}}
{{- printf "%s/%s:%s" .Values.worker.image.registry .Values.worker.image.repository (.Values.worker.image.tag | default .Chart.AppVersion) -}}
{{- end -}}
{{- end }}

{{- define "cvg-his-v2.spa.image" -}}
{{- if eq .Values.global.environment "production" -}}
{{- $sha := required "spa.image.sha is required for production image immutability" .Values.spa.image.sha -}}
{{- if not (regexMatch "^sha256:[a-f0-9]{64}$" $sha) -}}{{- fail "spa.image.sha must match sha256:<64 lowercase hex characters>" -}}{{- end -}}
{{- printf "%s/%s@%s" .Values.spa.image.registry .Values.spa.image.repository $sha -}}
{{- else if .Values.spa.image.sha -}}
{{- printf "%s/%s@%s" .Values.spa.image.registry .Values.spa.image.repository .Values.spa.image.sha -}}
{{- else -}}
{{- printf "%s/%s:%s" .Values.spa.image.registry .Values.spa.image.repository (.Values.spa.image.tag | default .Chart.AppVersion) -}}
{{- end -}}
{{- end }}

{{- define "cvg-his-v2.databaseMaintenance.initContainers" -}}
- name: migrate-database
  image: {{ include "cvg-his-v2.api.image" . }}
  imagePullPolicy: {{ .Values.api.image.pullPolicy }}
  command: ["node", "packages/db/dist/migrate.js"]
  securityContext:
    {{- toYaml .Values.securityContext | nindent 4 }}
  env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: {{ include "cvg-his-v2.postgres.secretName" . }}
          key: {{ .Values.postgresql.secretKeys.url }}
- name: reconcile-runtime-roles
  image: {{ include "cvg-his-v2.api.image" . }}
  imagePullPolicy: {{ .Values.api.image.pullPolicy }}
  command: ["node", "packages/db/dist/reconcile-runtime-roles.js"]
  securityContext:
    {{- toYaml .Values.securityContext | nindent 4 }}
  env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: {{ include "cvg-his-v2.postgres.secretName" . }}
          key: {{ .Values.postgresql.secretKeys.url }}
    - name: POSTGRES_API_USER
      value: {{ .Values.postgresql.auth.apiUsername | quote }}
    - name: POSTGRES_WORKER_USER
      value: {{ .Values.postgresql.auth.workerUsername | quote }}
{{- end }}
