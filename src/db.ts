import type { SQLiteDatabase } from 'expo-sqlite';
import type { MeterRecord, MeterInsert } from './types';

export async function initDb(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS meter_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block TEXT NOT NULL DEFAULT '',
      row_no TEXT,
      name TEXT,
      address TEXT,
      old_meter_number TEXT,
      meter_number TEXT,
      reading TEXT,
      sealed TEXT,
      location TEXT,
      usage_type TEXT,
      floor TEXT,
      note TEXT,
      survey_date TEXT,
      cover_type TEXT,
      created_at TEXT NOT NULL DEFAULT ''
    )
  `);
}

export function getBlocks(db: SQLiteDatabase): string[] {
  const rows = db.getAllSync<{ block: string }>(
    'SELECT DISTINCT block FROM meter_records ORDER BY block'
  );
  return rows.map((r) => r.block).filter(Boolean);
}

export function getRecords(db: SQLiteDatabase, block?: string | null): MeterRecord[] {
  if (block) {
    return db.getAllSync<MeterRecord>(
      'SELECT * FROM meter_records WHERE block = ? ORDER BY row_no',
      [block]
    );
  }
  return db.getAllSync<MeterRecord>(
    'SELECT * FROM meter_records ORDER BY block, row_no'
  );
}

export function importBlock(db: SQLiteDatabase, block: string, rows: MeterInsert[]) {
  db.runSync('DELETE FROM meter_records WHERE block = ?', [block]);
  const now = new Date().toISOString();
  for (const row of rows) {
    db.runSync(
      `INSERT INTO meter_records
        (block, row_no, name, address, old_meter_number, meter_number,
         reading, sealed, location, usage_type, floor, note, survey_date, cover_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.block, row.row_no, row.name, row.address, row.old_meter_number, row.meter_number,
        row.reading, row.sealed, row.location, row.usage_type, row.floor, row.note,
        row.survey_date, row.cover_type, now,
      ]
    );
  }
}

export function updateRecord(db: SQLiteDatabase, id: number, data: Partial<MeterInsert>) {
  const entries = Object.entries(data);
  if (entries.length === 0) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = [...entries.map(([, v]) => v), id];
  db.runSync(`UPDATE meter_records SET ${fields} WHERE id = ?`, values);
}
