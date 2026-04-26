import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, Pressable,
} from 'react-native';
import { C } from './theme';

type Props = {
  visible: boolean;
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
};

export default function PickerModal({ visible, title, options, value, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.title}>{title}</Text>
          <ScrollView>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.option, value === opt && s.optionActive]}
                onPress={() => { onSelect(opt); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[s.optionText, value === opt && s.optionTextActive]}>
                  {opt || '— 선택 안함 —'}
                </Text>
                {value === opt && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  sheet: {
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    width: '100%', maxHeight: 400,
    paddingVertical: 8,
  },
  title: {
    fontSize: 14, fontWeight: '700', color: C.textSub,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  optionActive: { backgroundColor: 'rgba(52,211,153,0.08)' },
  optionText: { fontSize: 15, color: C.textSub },
  optionTextActive: { color: C.accent, fontWeight: '600' },
  check: { color: C.accent, fontSize: 16 },
});
