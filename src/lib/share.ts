import { Capture } from './types';

export async function encodeTeam(captures: Capture[]): Promise<string> {
  const json = JSON.stringify(captures);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  
  const pako = await import('pako');
  const compressed = pako.gzip(data);
  
  let binary = '';
  compressed.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
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
  captures: Capture[],
  base64: string,
  options: { showTypes?: boolean; showLevels?: boolean } = {}
): string {
  const params = new URLSearchParams({ team: base64 });
  if (options.showTypes) params.set('showTypes', 'true');
  if (options.showLevels) params.set('showLevels', 'true');
  return `/share?${params.toString()}`;
}
