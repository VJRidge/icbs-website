import { describe, expect, it } from 'vitest';
import { siteNavIsActive } from './siteNavActive';

describe('siteNavIsActive', () => {
  it('treats / as home only, not as The book on every page', () => {
    expect(siteNavIsActive('/', '/')).toBe(true);
    expect(siteNavIsActive('/', '/about')).toBe(false);
    expect(siteNavIsActive('/products/i-call-bs', '/')).toBe(false);
    expect(siteNavIsActive('/products/i-call-bs', '/products/i-call-bs')).toBe(true);
  });
});
