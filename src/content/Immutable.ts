import type { JsonValue } from './CanonicalJson';

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isJsonCompatible(value: unknown): value is JsonValue {
  const seen = new Set<object>();

  function visit(candidate: unknown): boolean {
    if (
      candidate === null
      || typeof candidate === 'string'
      || typeof candidate === 'boolean'
    ) {
      return true;
    }

    if (typeof candidate === 'number') {
      return Number.isFinite(candidate);
    }

    if (typeof candidate !== 'object') {
      return false;
    }

    if (seen.has(candidate)) {
      return false;
    }
    seen.add(candidate);

    if (Array.isArray(candidate)) {
      return candidate.every((entry) => visit(entry));
    }

    if (!isPlainObject(candidate)) {
      return false;
    }

    return Object.values(candidate).every((entry) => visit(entry));
  }

  return visit(value);
}

export function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}
