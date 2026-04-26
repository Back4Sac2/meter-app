export type MeterRecord = {
  id: number;
  block: string;
  row_no: string | null;
  name: string | null;
  address: string | null;
  old_meter_number: string | null;
  meter_number: string | null;
  reading: string | null;
  sealed: string | null;
  location: string | null;
  usage_type: string | null;
  floor: string | null;
  note: string | null;
  survey_date: string | null;
  cover_type: string | null;
  created_at: string;
};

export type MeterInsert = Omit<MeterRecord, 'id' | 'created_at'>;
