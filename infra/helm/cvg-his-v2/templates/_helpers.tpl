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

{{- define "cvg-his-v2.databaseMaintenance.initContainers" -}}
- name: migrate-database
  image: {{ .Values.api.image.registry }}/{{ .Values.api.image.repository }}:{{ .Values.api.image.tag | default .Chart.AppVersion }}
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
  image: {{ .Values.api.image.registry }}/{{ .Values.api.image.repository }}:{{ .Values.api.image.tag | default .Chart.AppVersion }}
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
