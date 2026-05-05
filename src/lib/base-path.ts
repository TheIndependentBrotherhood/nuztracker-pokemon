/**
 * Returns the configured base path for this deployment (e.g. "/nuztracker-pokemon").
 * Empty string when running locally or on a root-path deployment.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefix a public-folder path with the deployment base path so that
 * fetch("/data/foo.json") works both locally and on GitHub Pages.
 *
 * @example publicPath("/data/pokemon-list.json")
 *          => "/nuztracker-pokemon/data/pokemon-list.json"  (GitHub Pages)
 *          => "/data/pokemon-list.json"                     (local dev)
 */
export function publicPath(path: string): string {
  return `${BASE_PATH}${path}`;
}
