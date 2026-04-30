export function getListendField(code: string): string[] {
  const fieldNames = new Set<string>();
  const getFormFieldRegex = /getFormField\(['"]([a-zA-Z0-9_-]+)['"]\)/g;
  let match;
  while ((match = getFormFieldRegex.exec(code)) !== null) {
    fieldNames.add(match[1]);
  }
  return Array.from(fieldNames);
}
