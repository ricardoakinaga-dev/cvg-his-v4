export function retryOperation(operation, options = {}) {
  const attempts = options.attempts ?? 1;
  const pause = options.pause ?? (() => undefined);

  if (!Number.isInteger(attempts) || attempts <= 0) {
    throw new Error('attempts must be a positive integer');
  }

  let finalError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return operation(attempt);
    } catch (error) {
      finalError = error;
      if (attempt < attempts) pause(attempt);
    }
  }

  throw finalError;
}
