import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { useStorage } from './useStorage';
import type { MeterInsert } from './types';
import { C } from './theme';

const EXCEL_MAP: Record<string, keyof MeterInsert> = {
  '도면번호': 'row_no',
  '성명': 'name',
  '도로명주소': 'address',
  '블록\r\n구분': 'block',
  '__EMPTY_7': 'old_meter_number',
  '__EMPTY_8': 'meter_number',
  '__EMPTY_13': 'reading',
  '__EMPTY_14': 'sealed',
  '__EMPTY_17': 'location',
  '__EMPTY_23': 'usage_type',
  '__EMPTY_26': 'floor',
  '비고': 'note',
  '조사일자': 'survey_date',
  '보호통뚜껑양식': 'cover_type',
};

const PREVIEW_COLS: { key: keyof MeterInsert; label: string }[] = [
  { key: 'row_no', label: 'NO' },
  { key: 'name', label: '성명' },
  { key: 'address', label: '주소' },
  { key: 'old_meter_number', label: '기물(기존)' },
  { key: 'meter_number', label: '기물번호' },
];

type Step = 1 | 2 | 3;
type Props = { onClose: () => void; onImported: () => void };

async function readWorkbook(uri: string): Promise<{ wb: XLSX.WorkBook; byteLength: number }> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const buf = await response.arrayBuffer();
    const uint8 = new Uint8Array(buf);
    return { wb: XLSX.read(uint8, { type: 'array' }), byteLength: uint8.length };
  }
  // content:// → file:// 로 명시적 복사
  const dest = FileSystem.cacheDirectory + 'meter_tmp.xlsx';
  await FileSystem.copyAsync({ from: uri, to: dest });
  const base64 = await FileSystem.readAsStringAsync(dest, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wb = XLSX.read(base64, { type: 'base64', cellDates: false, cellStyles: false, bookVBA: false, sheets: 0 });
  return { wb, byteLength: base64.length };
}

export default function MeterExcelUpload({ onClose, onImported }: Props) {
  const storage = useStorage();
  const [step, setStep] = useState<Step>(1);
  const [allRows, setAllRows] = useState<MeterInsert[]>([]);
  const [blockOptions, setBlockOptions] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [filteredRows, setFilteredRows] = useState<MeterInsert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePickFile() {
    setError(null);
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'android'
          ? ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
             'application/vnd.ms-excel',
             'application/octet-stream',
             '*/*']
          : ['public.spreadsheet', 'com.microsoft.excel.xls',
             'org.openxmlformats.spreadsheetml.sheet', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const { wb, byteLength } = await readWorkbook(uri);
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      // ws 자체가 없는 경우 (부분 파싱)
      if (!ws) {
        setError(`[진단] ws=undefined. 파일크기:${byteLength}B SheetNames:${JSON.stringify(wb.SheetNames)} Sheets keys:${JSON.stringify(Object.keys(wb.Sheets))}`);
        return;
      }

      const allParsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: null, raw: false,
      });

      // 진단: 파싱 결과 확인
      if (allParsed.length === 0) {
        const ref = (ws as Record<string, unknown>)['!ref'] ?? '없음';
        setError(`[진단] 파일크기:${byteLength}B ref:${ref} 시트:${sheetName}`);
        return;
      }

      const dataRows = allParsed.slice(2);
      if (dataRows.length === 0) {
        setError(`[진단] 전체 파싱 ${allParsed.length}행 — 헤더 2행 제외 후 데이터 없음. 첫행 키: ${Object.keys(allParsed[0]).slice(0, 5).join(', ')}`);
        return;
      }

      const parsed: MeterInsert[] = dataRows.map((r) => {
        const row: Partial<MeterInsert> = {};
        for (const [excelKey, dbKey] of Object.entries(EXCEL_MAP)) {
          const raw = r[excelKey];
          const val = raw !== null && raw !== undefined && String(raw).trim() !== ''
            ? String(raw).trim() : null;
          (row as Record<string, unknown>)[dbKey] = val;
        }
        return row as MeterInsert;
      });

      const blocks = [...new Set(parsed.map((r) => r.block).filter((b): b is string => !!b))].sort();
      if (blocks.length === 0) {
        setError(`[진단] ${dataRows.length}행 파싱됨. 블록구분 열 없음. 첫행 키: ${Object.keys(dataRows[0]).slice(0, 8).join(', ')}`);
        return;
      }

      setAllRows(parsed);
      setBlockOptions(blocks);
      setStep(2);
    } catch (e) {
      setError(`[오류] ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleBlockConfirm() {
    if (!selectedBlock) return;
    setFilteredRows(allRows.filter((r) => r.block === selectedBlock));
    setStep(3);
  }

  function handleImport() {
    setLoading(true);
    setError(null);
    try {
      storage.importBlock(selectedBlock, filteredRows);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : '가져오기에 실패했습니다.');
      setLoading(false);
    }
  }

  const STEPS = ['파일 선택', '블록 선택', '미리보기'];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={step === 1 ? onClose : undefined}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {/* 헤더 */}
          <View style={s.header}>
            <Text style={s.headerTitle}>엑셀 업로드</Text>
            <View style={s.stepRow}>
              {STEPS.map((label, i) => {
                const n = (i + 1) as Step;
                const active = step >= n;
                return (
                  <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.dot, active && s.dotActive]}>
                      <Text style={[s.dotText, active && s.dotTextActive]}>{n}</Text>
                    </View>
                    <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
                    {i < 2 && <Text style={s.stepArrow}>›</Text>}
                  </View>
                );
              })}
            </View>
            <TouchableOpacity onPress={onClose}><Text style={s.closeText}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView style={s.body}>
            {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

            {step === 1 && (
              <TouchableOpacity style={s.dropZone} onPress={handlePickFile} disabled={loading}>
                {loading ? <ActivityIndicator size="large" color={C.accent} /> : (
                  <>
                    <Text style={s.dropIcon}>📂</Text>
                    <Text style={s.dropTitle}>탭하여 엑셀 파일 선택</Text>
                    <Text style={s.dropSub}>.xlsx, .xls 지원</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {step === 2 && (
              <View style={{ gap: 12 }}>
                <Text style={s.desc}>
                  파일에서 <Text style={s.hl}>{blockOptions.length}개</Text> 블록을 찾았습니다.
                </Text>
                <View style={s.blockGrid}>
                  {blockOptions.map((b) => (
                    <TouchableOpacity
                      key={b}
                      style={[s.blockChip, selectedBlock === b && s.blockChipActive]}
                      onPress={() => setSelectedBlock(b)}
                    >
                      <Text style={[s.blockChipText, selectedBlock === b && s.blockChipTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedBlock && (
                  <Text style={s.blockInfo}>
                    선택: <Text style={s.hl}>{selectedBlock}</Text>
                    {' — '}{allRows.filter((r) => r.block === selectedBlock).length}개
                  </Text>
                )}
              </View>
            )}

            {step === 3 && (
              <View>
                <Text style={s.desc}>
                  <Text style={s.hl}>{selectedBlock}</Text> 블록의{' '}
                  <Text style={{ color: C.text, fontWeight: '700' }}>{filteredRows.length}개</Text>{' '}
                  레코드를 가져옵니다.
                </Text>
                <View style={s.table}>
                  <View style={s.tableHead}>
                    <Text style={[s.cell, s.cellIdx]}>#</Text>
                    {PREVIEW_COLS.map((c) => (
                      <Text key={c.key} style={[s.cell, s.cellHead]}>{c.label}</Text>
                    ))}
                  </View>
                  {filteredRows.slice(0, 8).map((row, i) => (
                    <View key={i} style={[s.tableRow, i % 2 === 0 && s.tableRowAlt]}>
                      <Text style={[s.cell, s.cellIdx]}>{i + 1}</Text>
                      {PREVIEW_COLS.map((c) => (
                        <Text key={c.key} style={s.cell} numberOfLines={1}>
                          {(row[c.key] as string) ?? '-'}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
                {filteredRows.length > 8 && (
                  <Text style={s.tableMore}>처음 8개 미리보기 · 전체 {filteredRows.length}개</Text>
                )}
              </View>
            )}
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={step === 1 ? onClose : () => setStep((p) => (p - 1) as Step)}
            >
              <Text style={s.cancelText}>{step === 1 ? '취소' : '이전'}</Text>
            </TouchableOpacity>
            {step === 2 && (
              <TouchableOpacity style={[s.nextBtn, !selectedBlock && s.btnDisabled]}
                onPress={handleBlockConfirm} disabled={!selectedBlock}>
                <Text style={s.nextText}>다음</Text>
              </TouchableOpacity>
            )}
            {step === 3 && (
              <TouchableOpacity style={[s.nextBtn, loading && s.btnDisabled]}
                onPress={handleImport} disabled={loading}>
                {loading
                  ? <ActivityIndicator size="small" color={C.accentText} />
                  : <Text style={s.nextText}>가져오기</Text>}
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: C.border, maxHeight: '88%',
  },
  header: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  stepRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.input, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: C.accent },
  dotText: { fontSize: 10, fontWeight: '700', color: C.textMuted },
  dotTextActive: { color: C.accentText },
  stepLabel: { fontSize: 11, color: C.textMuted, marginLeft: 3 },
  stepLabelActive: { color: C.textSub },
  stepArrow: { color: C.border, fontSize: 14, marginHorizontal: 2 },
  closeText: { color: C.textMuted, fontSize: 16, padding: 4 },
  body: { padding: 16 },
  errorBox: {
    backgroundColor: C.dangerBg, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorText: { color: C.danger, fontSize: 13 },
  dropZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8,
  },
  dropIcon: { fontSize: 40 },
  dropTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  dropSub: { fontSize: 13, color: C.textMuted },
  desc: { fontSize: 14, color: C.textSub, lineHeight: 20 },
  hl: { color: C.accent, fontWeight: '700' },
  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  blockChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
  },
  blockChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  blockChipText: { fontSize: 14, fontWeight: '700', color: C.textSub },
  blockChipTextActive: { color: C.accentText },
  blockInfo: { fontSize: 13, color: C.textMuted },
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  tableHead: { flexDirection: 'row', backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  cell: { flex: 1, fontSize: 11, color: C.textSub, paddingHorizontal: 6 },
  cellIdx: { flex: 0, width: 24, color: C.textMuted },
  cellHead: { color: C.textMuted, fontWeight: '600' },
  tableMore: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  cancelBtn: { flex: 1, paddingVertical: 13, backgroundColor: C.input, borderRadius: 10, alignItems: 'center' },
  cancelText: { color: C.textSub, fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 1, paddingVertical: 13, backgroundColor: C.accent, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  nextText: { color: C.accentText, fontSize: 15, fontWeight: '700' },
});
