import { describe, expect, it } from 'vitest';
import { ContentRegistry } from '../../src/content';

describe('ContentRegistry', () => {
  it('provides read-only lookup through stable ids', () => {
    const registry = new ContentRegistry([
      { id: 'bootstrap:test', label: 'test definition' },
    ]);

    expect(registry.size).toBe(1);
    expect(registry.has('bootstrap:test')).toBe(true);
    expect(registry.get('bootstrap:test').label).toBe('test definition');
  });

  it('rejects duplicate ids', () => {
    expect(() => new ContentRegistry([
      { id: 'duplicate' },
      { id: 'duplicate' },
    ])).toThrow(/Duplicate content definition id/);
  });
});
