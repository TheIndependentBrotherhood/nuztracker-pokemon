import { Capture } from './types';

export async function encodeTeam(captures: Capture[]): Promise<string> {
  const json = JSON.stringify(captures);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  
  const pako = await import('pako');
  const compressed = pako.gzip(data);
  
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < compressed.length; i += chunkSize) {
    parts.push(String.fromCharCode(...compressed.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(''));
}

export async function decodeTeam(base64: string): Promise<Capture[]> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const pako = await import('pako');
    const decompressed = pako.ungzip(bytes);
    const decoder = new TextDecoder();
    const json = decoder.decode(decompressed);
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function buildShareUrl(
  base64: string,
  options: { showTypes?: boolean; showLevels?: boolean } = {}
): string {
  const params = new URLSearchParams({ team: base64 });
  if (options.showTypes) params.set('showTypes', 'true');
  if (options.showLevels) params.set('showLevels', 'true');
  return `/share/?${params.toString()}`;
}
