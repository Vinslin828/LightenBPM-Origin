/**
 * Omit properties from an object
 *
 * @param obj - The source object
 * @param keys - Array of keys to omit
 * @returns A new object with the specified keys omitted
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
