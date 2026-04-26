import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, SafeAreaView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import * as XLSX from 'xlsx';
import type { MeterRecord } from './types';
import { C } from './theme';
import { useStorage } from './useStorage';
import MeterCard from './MeterCard';
import MeterEditModal from './MeterEditModal';
import MeterExcelUpload from './MeterExcelUpload';

const PAGE_SIZE = 30;

export default function MeterScreen() {
  const storage = useStorage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState<MeterRecord | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [blocks, setBlocks] = useState<string[]>([]);
  const [allRecords, setAllRecords] = useState<MeterRecord[]>([]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setBlocks(storage.getBlocks());
  }, [storage, refreshKey]);

  useEffect(() => {
    setAllRecords(storage.getRecords(selectedBlock));
    setPage(1);
  }, [storage, refreshKey, selectedBlock]);

  const searched = useMemo(() => {
    const t = searchText.trim().toLowerCase();
    if (!t) return allRecords;
    return allRecords.filter(
      (r: MeterRecord) =>
        r.row_no?.toLowerCase().includes(t) ||
        r.address?.toLowerCase().includes(t) ||
        r.old_meter_number?.toLowerCase().includes(t)
    );
  }, [allRecords, searchText]);

  const totalPages = Math.ceil(searched.length / PAGE_SIZE);
  const records = searched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleExport() {
    setExporting(true);
    try {
      const rows = storage.getRecords(selectedBlock);
      const data = rows.map((r) => ({
        블록: r.block,
        도면번호: r.row_no ?? '',
        성명: r.name ?? '',
        도로명주소: r.address ?? '',
        '기물번호(기존)': r.old_meter_number ?? '',
        기물번호: r.meter_number ?? '',
        지침: r.reading ?? '',
        봉인유무: r.sealed ?? '',
        위치: r.location ?? '',
        사용형태: r.usage_type ?? '',
        층수: r.floor ?? '',
        비고: r.note ?? '',
        조사일자: r.survey_date ?? '',
        보호통뚜껑양식: r.cover_type ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '야장');
      const label = selectedBlock ?? '전체';
      const filename = `야장_${label}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, filename);
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const Sharing = require('expo-sharing');
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
    } catch {
      Alert.alert('오류', '내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* 헤더 */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>야장관리</Text>
          <Text style={s.subtitle}>총 {searched.length}개</Text>
        </View>
        <View style={s.headerButtons}>
          <TouchableOpacity style={s.btnSecondary} onPress={handleExport} disabled={exporting}>
            {exporting
              ? <ActivityIndicator size="small" color={C.textSub} />
              : <Text style={s.btnSecondaryText}>내보내기</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.btnPrimary} onPress={() => setShowUpload(true)}>
            <Text style={s.btnPrimaryText}>업로드</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 블록 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterScroll}
      >
        <TouchableOpacity
          style={[s.chip, !selectedBlock && s.chipActive]}
          onPress={() => setSelectedBlock(null)}
        >
          <Text style={[s.chipText, !selectedBlock && s.chipTextActive]}>전체</Text>
        </TouchableOpacity>
        {blocks.map((b) => (
          <TouchableOpacity
            key={b}
            style={[s.chip, selectedBlock === b && s.chipActive]}
            onPress={() => setSelectedBlock(b)}
          >
            <Text style={[s.chipText, selectedBlock === b && s.chipTextActive]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 검색창 */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="도면번호 · 주소 · 기물번호 검색"
          placeholderTextColor={C.textMuted}
          value={searchText}
          onChangeText={(t) => { setSearchText(t); setPage(1); }}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={() => { setSearchText(''); setPage(1); }}>
            <Text style={s.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 리스트 */}
      <FlatList
        data={records}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MeterCard record={item} onEdit={() => setEditingRecord(item)} />
        )}
        contentContainerStyle={[s.list, records.length === 0 && s.listEmpty]}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>데이터가 없습니다</Text>
            <Text style={s.emptyDesc}>엑셀 파일을 업로드하여 데이터를 가져오세요</Text>
          </View>
        }
      />

      {/* 페이지네이션 — 하단 고정 */}
      {totalPages > 1 && (
        <View style={s.pagination}>
          <TouchableOpacity
            style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <Text style={s.pageBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.pageInfo}>{page} / {totalPages}</Text>
          <TouchableOpacity
            style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <Text style={s.pageBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {editingRecord && (
        <MeterEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => { setEditingRecord(null); refresh(); }}
        />
      )}
      {showUpload && (
        <MeterExcelUpload
          onClose={() => setShowUpload(false)}
          onImported={() => { setShowUpload(false); refresh(); }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? 44 : Platform.OS === 'web' ? 20 : 0,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  title: { fontSize: 22, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  btnSecondary: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, minWidth: 72, alignItems: 'center',
  },
  btnSecondaryText: { color: C.textSub, fontSize: 13, fontWeight: '600' },
  btnPrimary: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.accent, borderRadius: 10,
  },
  btnPrimaryText: { color: C.accentText, fontSize: 13, fontWeight: '700' },

  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: C.card, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  chipTextActive: { color: C.accentText },

  searchRow: {
    marginHorizontal: 16, marginBottom: 10, marginTop: 4,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10,
    color: C.text, fontSize: 14,
  },
  clearBtn: { paddingHorizontal: 14 },
  clearText: { color: C.textMuted, fontSize: 16 },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: C.textSub, fontSize: 15, fontWeight: '600' },
  emptyDesc: { color: C.textMuted, fontSize: 13, marginTop: 6 },

  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  pageBtn: {
    width: 36, height: 36, backgroundColor: C.card, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { color: C.text, fontSize: 20 },
  pageInfo: { color: C.textSub, fontSize: 14 },
});
