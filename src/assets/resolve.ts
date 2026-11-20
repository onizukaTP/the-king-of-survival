import manifest from './manifest.json';

const files: Record<string, string | undefined> = manifest;

/** Asset ID → URL. Unknown IDs get the generic placeholder instead of breaking the page. */
export function resolveAsset(id: string): string {
  return files[id] ?? manifest.placeholder;
}
