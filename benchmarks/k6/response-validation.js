export function createOpenApiPathsCheck() {
  // k6 instantiates this closure independently for each VU. Retain only the
  // last complete body and its boolean result, never a parsed response graph.
  let previousBody;
  let previousResult = false;

  return function hasOpenApiPaths(response) {
    const body = response.body;
    if (typeof body === 'string' && body === previousBody) return previousResult;

    let valid = false;
    try {
      // Preserve whole-document decoding whenever any part of the body changes,
      // including failures for malformed JSON and non-finite numeric values.
      const document = response.json();
      valid = Boolean(document.paths && Object.keys(document.paths).length > 0);
    } catch {
      valid = false;
    }
    previousBody = typeof body === 'string' ? body : undefined;
    previousResult = valid;
    return valid;
  };
}
