import { webStorage } from './storage';
import type { Storage } from './storage';

export function useStorage(): Storage {
  return webStorage;
}
