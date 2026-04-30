/**
 * Data Transformation Utilities
 *
 * - Converts object keys between snake_case and camelCase
 * - Converts Date objects to epoch time (milliseconds)
 */

/**
 * Convert a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_: string, letter: string) =>
    letter.toUpperCase(),
  );
}

/**
 * Convert a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively convert all keys in an object from snake_case to camelCase
 * Also converts Date objects to epoch time (milliseconds)
 */
export function keysToCamelCase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => keysToCamelCase(item)) as T;
  }

  // Convert Date to epoch time
  if (obj instanceof Date) {
    return obj.getTime() as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = keysToCamelCase(value);
    }
    return result as T;
  }

  return obj;
}
