import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { MeterRecord } from './types';
import { C } from './theme';

type Props = { record: MeterRecord; onEdit: () => void };

const SURVEY_FIELDS: { key: keyof MeterRecord; label: string }[] = [
  { key: 'meter_number', label: '기물번호' },
  { key: 'reading', label: '지침' },
  { key: 'sealed', label: '봉인유무' },
  { key: 'location', label: '위치' },
  { key: 'usage_type', label: '사용형태' },
  { key: 'floor', label: '층수' },
  { key: 'note', label: '비고' },
  { key: 'cover_type', label: '보호통뚜껑' },
];

export default function MeterCard({ record: r, onEdit }: Props) {
  const hasSurvey = SURVEY_FIELDS.some(({ key }) => !!r[key]) || !!r.survey_date;
  const filled = SURVEY_FIELDS.filter(({ key }) => !!r[key]);

  return (
    <View style={s.card}>
      <View style={s.body}>
        {/* 상단 식별 정보 */}
        <View style={s.topRow}>
          {r.row_no && <Text style={s.rowNo}>도면{r.row_no}</Text>}
          <Text style={s.name} numberOfLines={1}>{r.name ?? '-'}</Text>
        </View>
        <Text style={s.address} numberOfLines={1}>{r.address ?? '-'}</Text>
        <Text style={s.oldMeter}>기물번호(기존): <Text style={s.mono}>{r.old_meter_number ?? '-'}</Text></Text>

        {/* 조사 완료 데이터 */}
        {hasSurvey && (
          <View style={s.surveyGrid}>
            {filled.map(({ key, label }) => (
              <View key={key} style={s.surveyItem}>
                <Text style={s.surveyLabel}>{label}</Text>
                <Text style={s.surveyValue}>{String(r[key])}</Text>
              </View>
            ))}
            {r.survey_date && (
              <View style={[s.surveyItem, s.surveyFull]}>
                <Text style={s.surveyLabel}>조사일자</Text>
                <Text style={[s.surveyValue, s.mono]}>{r.survey_date}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 수정 버튼 */}
      <TouchableOpacity style={s.editBtn} onPress={onEdit} activeOpacity={0.7}>
        <Text style={s.editText}>수정</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  body: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowNo: { fontSize: 11, color: C.textMuted, fontVariant: ['tabular-nums'] },
  name: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  address: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  oldMeter: { fontSize: 12, color: C.textMuted },
  mono: { fontVariant: ['tabular-nums'], color: C.textSub },

  surveyGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  surveyItem: { minWidth: '40%' },
  surveyFull: { width: '100%' },
  surveyLabel: { fontSize: 11, color: C.textMuted, marginBottom: 2 },
  surveyValue: { fontSize: 12, fontWeight: '600', color: C.textSub },

  editBtn: {
    paddingVertical: 12, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border,
  },
  editText: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
});
