import { customAlphabet } from 'nanoid';

const alphabet =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 12);

/**
 * Generates a short, URL-safe public ID with a configurable prefix.
 * @returns A string like "U1234567890ab"
 */
export function generatePublicId(): string {
  const prefix = process.env.PUBLIC_ID_PREFIX || '';
  return `${prefix}${nanoid()}`;
}
