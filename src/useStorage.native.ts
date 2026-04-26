import { useSQLiteContext } from 'expo-sqlite';
import { getBlocks, getRecords, importBlock, updateRecord } from './db';
import type { Storage } from './storage';

export function useStorage(): Storage {
  const db = useSQLiteContext();
  return {
    getBlocks: () => getBlocks(db),
    getRecords: (block) => getRecords(db, block),
    importBlock: (block, rows) => importBlock(db, block, rows),
    updateRecord: (id, data) => updateRecord(db, id, data),
  };
}
