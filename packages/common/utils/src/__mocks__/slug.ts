export default function slug(value: string, opts?: { lower?: boolean }): string {
  const slugified = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return opts?.lower ? slugified.toLowerCase() : slugified;
}
