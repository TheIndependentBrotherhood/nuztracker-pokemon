import { Run } from './types';

const STORAGE_KEY = 'nuztracker-runs';

export function getRuns(): Run[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRuns(runs: Run[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export function getRun(id: string): Run | null {
  return getRuns().find((r) => r.id === id) ?? null;
}

export function saveRun(run: Run): void {
  const runs = getRuns();
  const idx = runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) runs[idx] = run;
  else runs.push(run);
  saveRuns(runs);
}

export function deleteRun(id: string): void {
  saveRuns(getRuns().filter((r) => r.id !== id));
}
