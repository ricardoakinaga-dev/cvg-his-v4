/**
 * Canonical clinical attachment upload limits.
 *
 * The public JSON upload carries binary content as base64. Keep the decoded
 * file limit and the encoded request limit together so transport boundaries do
 * not accidentally reject a valid file before the API can validate it.
 */
export const MAX_ATTACHMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Exact base64 length for a binary payload at the decoded-file frontier. */
export const MAX_ATTACHMENT_BASE64_LENGTH =
  Math.ceil(MAX_ATTACHMENT_FILE_SIZE_BYTES / 3) * 4;

/** Headroom for attachment metadata and JSON framing around the base64 field. */
export const ATTACHMENT_JSON_METADATA_HEADROOM_BYTES = 1 * 1024 * 1024;

/** Maximum JSON request body accepted by the API attachment boundary. */
export const MAX_ATTACHMENT_JSON_BODY_BYTES =
  MAX_ATTACHMENT_BASE64_LENGTH + ATTACHMENT_JSON_METADATA_HEADROOM_BYTES;

/**
 * Nginx ingress uses a human-readable MiB ceiling. Round the API body limit
 * upward so an ingress never rejects a request that the API is contractually
 * able to accept.
 */
export const MAX_ATTACHMENT_INGRESS_BODY_MIB = Math.ceil(
  MAX_ATTACHMENT_JSON_BODY_BYTES / (1024 * 1024)
);

export const MAX_ATTACHMENT_INGRESS_BODY_SIZE = `${MAX_ATTACHMENT_INGRESS_BODY_MIB}m`;

