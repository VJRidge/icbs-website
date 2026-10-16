export function siteNavIsActive(href: string, path: string): boolean {
  const route = href.split('#')[0] || '/';
  if (route === '/') return path === '/';
  return path === route || path.startsWith(`${route}/`);
}
