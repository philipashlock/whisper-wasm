export function createTimeoutError(timeoutMs: number, errorMessage: string) {
  let timeoutId: NodeJS.Timeout | null = null;
  let isResolved = false;
  let rejectPromise: ((error: Error) => void) | null = null;
  let resolvePromise: ((value: void) => void) | null = null;

  const timeoutError = (): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;

      timeoutId = setTimeout(() => {
        if (!isResolved && rejectPromise) {
          isResolved = true;
          rejectPromise(new Error(errorMessage));
        }
      }, timeoutMs);
    });
  };

  const clear = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (resolvePromise) {
      resolvePromise();
      resolvePromise = null;
    }
    isResolved = true;
    rejectPromise = null;
  };

  return { timeoutError, clear };
}
