/** Freeze a plain configuration value, including nested objects and arrays. */
export function freeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) freeze(item);
    return Object.freeze(value) as T;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value as object)) freeze(item);
    return Object.freeze(value);
  }
  return value;
}
