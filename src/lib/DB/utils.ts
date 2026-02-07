export function getDomainFromUrl(url: string): string {
  return new URL(url).hostname;
}
