import type { MeterRecord, MeterInsert } from './types';

export interface Storage {
  getBlocks(): string[];
  getRecords(block?: string | null): MeterRecord[];
  importBlock(block: string, rows: MeterInsert[]): void;
  updateRecord(id: number, data: Partial<MeterInsert>): void;
}

// 웹 전용 인메모리 스토리지 (테스트/미리보기용)
let _records: MeterRecord[] = [];
let _nextId = 1;

export const webStorage: Storage = {
  getBlocks() {
    return [...new Set(_records.map((r) => r.block).filter(Boolean))].sort();
  },
  getRecords(block) {
    const list = block ? _records.filter((r) => r.block === block) : [..._records];
    return list.sort((a, b) => (a.row_no ?? '').localeCompare(b.row_no ?? '', undefined, { numeric: true }));
  },
  importBlock(block, rows) {
    _records = _records.filter((r) => r.block !== block);
    const now = new Date().toISOString();
    for (const row of rows) {
      _records.push({ ...row, id: _nextId++, created_at: now });
    }
  },
  updateRecord(id, data) {
    _records = _records.map((r) => (r.id === id ? { ...r, ...data } : r));
  },
};
