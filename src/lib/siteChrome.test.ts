import { describe, expect, it } from 'vitest';
import { withFooterCopyright, withFooterFaq, withHeaderBookHref, type SiteMenuItem } from './siteChrome';


const footerWithoutFaq: SiteMenuItem[] = [
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'contact', label: 'Contact', href: '/contact' },
  { id: 'privacy', label: 'Privacy', href: '/privacy' },
  { id: 'terms', label: 'Terms', href: '/terms' },
];

describe('withFooterFaq', () => {
  it('inserts FAQ before Privacy when the saved footer omits it', () => {
    expect(withFooterFaq(footerWithoutFaq).map((item) => item.href)).toEqual([
      '/blog',
      '/contact',
      '/faq',
      '/privacy',
      '/terms',
    ]);
  });

  it('does not duplicate FAQ if it is already present', () => {
    const withFaq = withFooterFaq(footerWithoutFaq);
    expect(withFooterFaq(withFaq)).toEqual(withFaq);
  });
});

describe('withFooterCopyright', () => {
  it('inserts Copyright after Refunds when the saved footer omits it', () => {
    const withRefunds: SiteMenuItem[] = [
      ...footerWithoutFaq,
      { id: 'refunds', label: 'Refunds', href: '/refunds' },
    ];
    expect(withFooterCopyright(withRefunds).map((item) => item.href)).toEqual([
      '/blog',
      '/contact',
      '/privacy',
      '/terms',
      '/refunds',
      '/copyright',
    ]);
  });

  it('does not duplicate Copyright if it is already present', () => {
    const items: SiteMenuItem[] = [
      { id: 'copyright', label: 'Copyright', href: '/copyright' },
    ];
    expect(withFooterCopyright(items)).toEqual(items);
  });
});

describe('withHeaderBookHref', () => {
  it('moves The book off / onto the book page', () => {
    expect(
      withHeaderBookHref([{ id: 'book', label: 'The book', href: '/' }]).map((item) => item.href),
    ).toEqual(['/products/i-call-bs']);
  });

  it('leaves a Home item on /', () => {
    expect(withHeaderBookHref([{ id: 'home', label: 'Home', href: '/' }])[0]?.href).toBe('/');
  });
});

