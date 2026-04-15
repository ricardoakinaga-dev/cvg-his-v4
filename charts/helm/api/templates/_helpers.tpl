{{/*
Expand the name of the chart.
*/}}
{{- define "cvg-his-v2-api.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "cvg-his-v2-api.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version that is used for the unique labels and selectors.
*/}}
{{- define "cvg-his-v2-api.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cvg-his-v2-api.labels" -}}
app.kubernetes.io/name: {{ include "cvg-his-v2-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
app.kubernetes.io/component: api
app.kubernetes.io/part-of: cvg-his-v2
{{- end }}

{{/*
Service account name for API
*/}}
{{- define "cvg-his-v2-api.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "cvg-his-v2-api.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "cvg-his-v2-api.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cvg-his-v2-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
