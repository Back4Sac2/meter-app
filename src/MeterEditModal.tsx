import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useStorage } from './useStorage';
import type { MeterRecord, MeterInsert } from './types';
import { C } from './theme';
import PickerModal from './PickerModal';

const LOCATION_OPTIONS = [
  '', '건물 앞(내부)', '건물 앞(외부)', '건물 좌(내부)', '건물 좌(외부)',
  '건물 우(내부)', '건물 우(외부)', '건물 뒤(내부)', '건물 뒤(외부)',
];
const COVER_OPTIONS = ['', '뚜껑 파손', '뚜껑 없음', '없음'];

function nowString() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

type Props = { record: MeterRecord; onClose: () => void; onSaved: () => void };

export default function MeterEditModal({ record, onClose, onSaved }: Props) {
  const storage = useStorage();
  const isSameInit = !!record.old_meter_number && record.meter_number === record.old_meter_number;

  const [meterSame, setMeterSame] = useState(isSameInit);
  const [values, setValues] = useState<Partial<MeterInsert>>({
    meter_number: record.meter_number,
    reading: record.reading,
    sealed: record.sealed ?? '유',
    location: record.location ?? '',
    usage_type: record.usage_type ?? '',
    floor: record.floor ?? '',
    note: record.note ?? '',
    survey_date: nowString(),
    cover_type: record.cover_type ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locationPicker, setLocationPicker] = useState(false);
  const [coverPicker, setCoverPicker] = useState(false);

  function set<K extends keyof MeterInsert>(key: K, val: MeterInsert[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<MeterInsert> = {
        ...values,
        meter_number: meterSame ? record.old_meter_number : (values.meter_number || null),
        reading: values.reading || null,
        sealed: values.sealed || null,
        location: values.location || null,
        usage_type: values.usage_type || null,
        floor: values.floor || null,
        note: values.note || null,
        cover_type: values.cover_type || null,
      };
      storage.updateRecord(record.id, payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kavWrapper}
        >
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.handle} />

            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>수정</Text>
                <Text style={s.headerSub}>
                  {record.row_no ? `도면번호 ${record.row_no}  ` : ''}{record.name ?? ''}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.identityBox}>
              <Text style={s.identityText} numberOfLines={1}>{record.address ?? '-'}</Text>
              <Text style={s.identityText}>
                기물번호(기존): <Text style={s.mono}>{record.old_meter_number ?? '-'}</Text>
              </Text>
            </View>

            <ScrollView style={s.form} showsVerticalScrollIndicator={false}>
              {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

              <Label text="기물번호" />
              <View style={s.toggleRow}>
                <TouchableOpacity
                  style={[s.toggleBtn, meterSame && s.toggleBtnGreen]}
                  onPress={() => { setMeterSame(true); set('meter_number', record.old_meter_number); }}
                >
                  <Text style={[s.toggleBtnText, meterSame && s.toggleBtnTextDark]}>O — 기존과 동일</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, !meterSame && s.toggleBtnWhite]}
                  onPress={() => { setMeterSame(false); set('meter_number', isSameInit ? null : record.meter_number); }}
                >
                  <Text style={[s.toggleBtnText, !meterSame && s.toggleBtnTextDark]}>X — 직접 입력</Text>
                </TouchableOpacity>
              </View>
              {meterSame ? (
                <View style={s.displayBox}>
                  <Text style={[s.displayText, s.mono]}>{record.old_meter_number ?? '-'}</Text>
                </View>
              ) : (
                <Field placeholder="기물번호 입력" value={(values.meter_number as string) ?? ''} onChangeText={(t) => set('meter_number', t || null)} />
              )}

              <Label text="지침" />
              <Field placeholder="숫자 입력" value={(values.reading as string) ?? ''} onChangeText={(t) => set('reading', t || null)} keyboardType="numeric" />

              <Label text="봉인유무" />
              <View style={s.radioRow}>
                {['유', '무'].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[s.radioBtn, values.sealed === v && s.radioBtnActive]}
                    onPress={() => set('sealed', v)}
                  >
                    <Text style={[s.radioBtnText, values.sealed === v && s.radioBtnTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Label text="위치" />
              <TouchableOpacity style={s.selectBtn} onPress={() => setLocationPicker(true)}>
                <Text style={values.location ? s.selectText : s.selectPlaceholder}>{values.location || '— 선택 —'}</Text>
                <Text style={s.selectArrow}>▾</Text>
              </TouchableOpacity>

              <Label text="사용형태" />
              <Field placeholder="예: 가정집, 상가" value={(values.usage_type as string) ?? ''} onChangeText={(t) => set('usage_type', t || null)} />

              <Label text="층수" />
              <Field placeholder="예: 1, 2, B1" value={(values.floor as string) ?? ''} onChangeText={(t) => set('floor', t || null)} />

              <Label text="비고" />
              <Field value={(values.note as string) ?? ''} onChangeText={(t) => set('note', t || null)} />

              <Label text="조사일자" sub="(입력 시각 자동 기록)" />
              <Field value={(values.survey_date as string) ?? ''} onChangeText={(t) => set('survey_date', t || null)} mono />

              <Label text="보호통뚜껑양식" />
              <TouchableOpacity style={s.selectBtn} onPress={() => setCoverPicker(true)}>
                <Text style={values.cover_type ? s.selectText : s.selectPlaceholder}>{values.cover_type || '— 선택 —'}</Text>
                <Text style={s.selectArrow}>▾</Text>
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, saving && s.btnDisabled]} onPress={handleSave} disabled={saving}>
                <Text style={s.saveText}>{saving ? '저장 중...' : '저장'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

      <PickerModal visible={locationPicker} title="위치 선택" options={LOCATION_OPTIONS}
        value={(values.location as string) ?? ''} onSelect={(v) => set('location', v || null)} onClose={() => setLocationPicker(false)} />
      <PickerModal visible={coverPicker} title="보호통뚜껑양식 선택" options={COVER_OPTIONS}
        value={(values.cover_type as string) ?? ''} onSelect={(v) => set('cover_type', v || null)} onClose={() => setCoverPicker(false)} />
    </Modal>
  );
}

function Label({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 16 }}>
      <Text style={lbl.label}>{text}</Text>
      {sub && <Text style={lbl.sub}>{sub}</Text>}
    </View>
  );
}

function Field({ value, onChangeText, placeholder, keyboardType, mono }: {
  value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric'; mono?: boolean;
}) {
  return (
    <TextInput
      style={[lbl.input, mono && lbl.mono]}
      value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={C.textMuted}
      keyboardType={keyboardType ?? 'default'}
    />
  );
}

const lbl = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: C.textSub },
  sub: { fontSize: 11, color: C.textMuted, marginLeft: 6 },
  input: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: C.text,
  },
  mono: { fontVariant: ['tabular-nums'] },
});

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  kavWrapper: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: C.border, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  closeBtn: { padding: 6 },
  closeBtnText: { color: C.textMuted, fontSize: 18 },
  identityBox: {
    backgroundColor: C.bg, paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 3,
  },
  identityText: { fontSize: 12, color: C.textMuted },
  mono: { fontVariant: ['tabular-nums'], color: C.textSub },
  form: { paddingHorizontal: 20 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  toggleBtnGreen: { backgroundColor: C.accent, borderColor: C.accent },
  toggleBtnWhite: { backgroundColor: '#e4e4e7', borderColor: '#e4e4e7' },
  toggleBtnText: { fontSize: 13, fontWeight: '700', color: C.textSub },
  toggleBtnTextDark: { color: C.accentText },
  displayBox: {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
  },
  displayText: { fontSize: 14, color: C.textMuted },
  radioRow: { flexDirection: 'row', gap: 12 },
  radioBtn: {
    paddingHorizontal: 28, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
  },
  radioBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  radioBtnText: { fontSize: 15, fontWeight: '600', color: C.textSub },
  radioBtnTextActive: { color: C.accentText },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
  },
  selectText: { fontSize: 14, color: C.text },
  selectPlaceholder: { fontSize: 14, color: C.textMuted },
  selectArrow: { color: C.textMuted, fontSize: 14 },
  errorBox: {
    backgroundColor: C.dangerBg, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 8, padding: 10, marginTop: 12,
  },
  errorText: { color: C.danger, fontSize: 13 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  cancelBtn: { flex: 1, paddingVertical: 13, backgroundColor: C.input, borderRadius: 10, alignItems: 'center' },
  cancelText: { color: C.textSub, fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 13, backgroundColor: C.accent, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  saveText: { color: C.accentText, fontSize: 15, fontWeight: '700' },
});
