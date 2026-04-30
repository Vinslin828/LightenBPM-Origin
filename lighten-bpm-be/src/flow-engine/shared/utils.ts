/**
 * General Utility Functions
 *
 * Pure utility functions that don't belong to a specific domain (form/flow).
 * These functions are context-agnostic and reusable across the codebase.
 */

/**
 * Attempt to coerce a value to a number
 *
 * @param value - The value to coerce
 * @returns The coerced number, or null if coercion fails
 *
 * @example
 * coerceToNumber(42) // 42
 * coerceToNumber("123") // 123
 * coerceToNumber("abc") // null
 */
export function coerceToNumber(value: any): number | null {
  // Already a number
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return null;
    }
    return value;
  }

  // Try to convert from string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }

    const parsed = Number(trimmed);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return null;
    }
    return parsed;
  }

  // Cannot convert other types
  return null;
}

/**
 * Attempt to coerce a value to a string (text)
 *
 * @param value - The value to coerce
 * @returns The coerced string, or null if coercion fails
 *
 * @example
 * coerceToText("hello") // "hello"
 * coerceToText(123) // "123"
 * coerceToText(null) // null
 */
export function coerceToText(value: any): string | null {
  // Already a string
  if (typeof value === 'string') {
    return value;
  }

  // Convert number or boolean to string
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Cannot convert null, undefined, objects, or arrays
  return null;
}

/**
 * Attempt to coerce a value to a boolean
 *
 * @param value - The value to coerce
 * @returns The coerced boolean, or null if coercion fails
 *
 * @example
 * coerceToBoolean(true) // true
 * coerceToBoolean(false) // false
 * coerceToBoolean("true") // true
 * coerceToBoolean("false") // false
 * coerceToBoolean(1) // true
 * coerceToBoolean(0) // false
 * coerceToBoolean("abc") // null
 */
export function coerceToBoolean(value: any): boolean | null {
  // Already a boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // Convert from string
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true') {
      return true;
    }
    if (lower === 'false') {
      return false;
    }
    return null;
  }

  // Convert from number (0 = false, 1 = true)
  if (typeof value === 'number') {
    if (value === 0) {
      return false;
    }
    if (value === 1) {
      return true;
    }
    return null;
  }

  // Cannot convert other types
  return null;
}

/**
 * Attempt to coerce a value to a Unix timestamp
 *
 * @param value - The value to coerce
 * @returns The coerced timestamp (number), or null if coercion fails
 *
 * @example
 * coerceToTimestamp(1734299400) // 1734299400
 * coerceToTimestamp("1734299400") // 1734299400
 * coerceToTimestamp(-1) // null (negative timestamps not allowed)
 * coerceToTimestamp("abc") // null
 */
export function coerceToTimestamp(value: any): number | null {
  // Try to coerce to number first
  const numValue = coerceToNumber(value);

  if (numValue === null) {
    return null;
  }

  // Validate that it's a non-negative integer (Unix timestamp)
  if (numValue < 0 || !Number.isInteger(numValue)) {
    return null;
  }

  return numValue;
}

/**
 * Attempt to coerce a value to a currency value object
 *
 * Accepts only plain objects with a numeric (or numeric-string) `value` and a
 * non-empty string `currencyCode`. Plain numbers are rejected because they
 * carry no currency information.
 *
 * @param value - The value to coerce
 * @returns { value: number, currencyCode: string } or null if coercion fails
 *
 * @example
 * coerceToCurrency({ value: 9999, currencyCode: "TWD" }) // { value: 9999, currencyCode: "TWD" }
 * coerceToCurrency({ value: "9999", currencyCode: "TWD" }) // { value: 9999, currencyCode: "TWD" }
 * coerceToCurrency(9999) // null (missing currencyCode)
 * coerceToCurrency({ value: 9999 }) // null (missing currencyCode)
 * coerceToCurrency({ value: "abc", currencyCode: "TWD" }) // null (invalid value)
 */
export function coerceToCurrency(
  value: unknown,
): { value: number; currencyCode: string } | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('value' in value) ||
    !('currencyCode' in value)
  ) {
    return null;
  }

  const obj = value as { value: unknown; currencyCode: unknown };

  const numericValue = coerceToNumber(obj.value);
  if (numericValue === null) {
    return null;
  }

  if (typeof obj.currencyCode !== 'string' || obj.currencyCode.trim() === '') {
    return null;
  }

  return { value: numericValue, currencyCode: obj.currencyCode };
}

/**
 * Attempt to coerce a value to a string array
 * Used for dropdown with multipleSelection
 *
 * @param value - The value to coerce
 * @returns The coerced string array, or null if coercion fails
 *
 * @example
 * coerceToStringArray(["a", "b"]) // ["a", "b"]
 * coerceToStringArray("single") // ["single"]
 * coerceToStringArray([1, 2]) // ["1", "2"]
 * coerceToStringArray(null) // null
 */
export function coerceToStringArray(value: any): string[] | null {
  // Already an array
  if (Array.isArray(value)) {
    // Try to convert all elements to strings
    const result: string[] = [];
    for (const item of value) {
      const str = coerceToText(item);
      if (str === null) {
        return null; // Cannot convert one of the items
      }
      result.push(str);
    }
    return result;
  }

  // Single value - wrap in array
  const str = coerceToText(value);
  if (str === null) {
    return null;
  }
  return [str];
}

/**
 * Attempt to coerce option objects to a string array
 * Handles objects with 'value' property (e.g., from frontend option selections)
 *
 * @param value - The value to coerce (can be option objects or primitives)
 * @returns The coerced string array, or null if coercion fails
 *
 * @example
 * coerceOptionObjectsToStringArray([{value: "a"}, {value: "b"}]) // ["a", "b"]
 * coerceOptionObjectsToStringArray(["a", "b"]) // ["a", "b"]
 * coerceOptionObjectsToStringArray({value: "single"}) // ["single"]
 * coerceOptionObjectsToStringArray("single") // ["single"]
 * coerceOptionObjectsToStringArray(null) // null
 */
export function coerceOptionObjectsToStringArray(value: any): string[] | null {
  // Already an array
  if (Array.isArray(value)) {
    const result: string[] = [];
    for (const item of value) {
      // Handle object with 'value' property (from frontend checkbox options)
      if (
        typeof item === 'object' &&
        item !== null &&
        'value' in item &&
        !Array.isArray(item)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const str = coerceToText(item.value);
        if (str === null) {
          return null;
        }
        result.push(str);
      } else {
        // Handle primitive values (fallback for backward compatibility)
        const str = coerceToText(item);
        if (str === null) {
          return null;
        }
        result.push(str);
      }
    }
    return result;
  }

  // Handle single object with 'value' property
  if (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    !Array.isArray(value)
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const str = coerceToText(value.value);
    if (str === null) {
      return null;
    }
    return [str];
  }

  // Single primitive value - wrap in array (fallback for backward compatibility)
  const str = coerceToText(value);
  if (str === null) {
    return null;
  }
  return [str];
}
