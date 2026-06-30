import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MemoryCard from '../components/MemoryCard';
import { memorySystem } from '../memory/memory-system';
import { query } from '../database/db';
import { Character, MemoryNode } from '../database/schema';

const NATURE_CATEGORIES = ['事实信息', '个人偏好', '事件经历', '情绪感受', '知识技能', '人际动态', '目标计划'];
const SORT_OPTIONS = [
    { key: 'created_at' as const, label: '最近创建' },
    { key: 'weight' as const, label: '权重最高' },
    { key: 'access_count' as const, label: '访问最多' },
];

interface CharacterInfo { id: number; name: string; }

export default function MemoryScreen() {
    const navigation = useNavigation<any>();
    const [memories, setMemories] = useState<MemoryNode[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedNature, setSelectedNature] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [characters, setCharacters] = useState<CharacterInfo[]>([]);
    const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'created_at' | 'weight' | 'access_count'>('created_at');

    // 加载角色列表
    useFocusEffect(useCallback(() => {
        query<Character>('SELECT id, name FROM characters ORDER BY id').then(chars => {
            setCharacters(chars.map(c => ({ id: c.id!, name: c.name })));
        });
    }, []));

    const loadMemories = useCallback(async () => {
        try {
            let data: MemoryNode[];
            const cid = selectedCharId || undefined;
            if (searchText.trim()) {
                data = await memorySystem.searchByContent(searchText.trim(), cid, 50);
            } else if (selectedNature) {
                data = await memorySystem.searchByTags([selectedNature], 'nature', cid, 50);
            } else {
                data = await memorySystem.getMemoriesSorted(sortBy, cid, 50);
            }
            setMemories(data);
        } catch (error) { console.error('Failed to load memories:', error); }
    }, [selectedNature, searchText, selectedCharId, sortBy]);

    useFocusEffect(useCallback(() => { loadMemories(); }, [loadMemories]));

    const onRefresh = useCallback(async () => { setRefreshing(true); await loadMemories(); setRefreshing(false); }, [loadMemories]);

    const clearFilter = () => { setSelectedNature(null); setSearchText(''); };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>记忆</Text>
                    <Text style={styles.subtitle}>共 {memories.length} 条记忆</Text>
                </View>
                <TouchableOpacity style={styles.graphBtn} onPress={() => navigation.navigate('MemoryGraph')}>
                    <Text style={styles.graphBtnText}>图谱</Text>
                </TouchableOpacity>
            </View>

            {/* 角色选择器 */}
            <View style={styles.charSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.charChip, !selectedCharId && styles.charChipActive]}
                        onPress={() => setSelectedCharId(null)}
                    >
                        <Text style={[styles.charChipText, !selectedCharId && styles.charChipTextActive]}>全部</Text>
                    </TouchableOpacity>
                    {characters.map(char => (
                        <TouchableOpacity
                            key={char.id}
                            style={[styles.charChip, selectedCharId === char.id && styles.charChipActive]}
                            onPress={() => setSelectedCharId(char.id)}
                        >
                            <Text style={[styles.charChipText, selectedCharId === char.id && styles.charChipTextActive]}>{char.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* 搜索框 */}
            <View style={styles.searchSection}>
                <TextInput
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="搜索记忆内容..."
                    placeholderTextColor="#999"
                    returnKeyType="search"
                />
            </View>

            {/* 标签筛选 */}
            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[styles.filterChip, !selectedNature && !searchText && styles.filterChipActive]}
                        onPress={clearFilter}
                    >
                        <Text style={styles.filterChipText}>全部</Text>
                    </TouchableOpacity>
                    {NATURE_CATEGORIES.map(tag => (
                        <TouchableOpacity
                            key={tag}
                            style={[styles.filterChip, styles.natureChip, selectedNature === tag && styles.natureChipActive]}
                            onPress={() => { setSelectedNature(tag); setSearchText(''); }}
                        >
                            <Text style={styles.filterChipText}>{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* 排序选项 */}
            {!searchText && !selectedNature && (
                <View style={styles.sortSection}>
                    {SORT_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
                            onPress={() => setSortBy(opt.key)}
                        >
                            <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {memories.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🧠</Text>
                    <Text style={styles.emptyText}>还没有记忆</Text>
                    <Text style={styles.emptyHint}>开始对话后，AI会记住重要的事情</Text>
                </View>
            ) : (
                <FlatList
                    data={memories}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <MemoryCard memory={item} onUpdate={loadMemories} onDelete={loadMemories} />}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
    graphBtn: { backgroundColor: '#6C63FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    graphBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    charSection: { paddingVertical: 8, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    charChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0', marginRight: 8 },
    charChipActive: { backgroundColor: '#6C63FF' },
    charChipText: { fontSize: 13, color: '#666' },
    charChipTextActive: { color: '#fff', fontWeight: 'bold' },
    searchSection: { padding: 8, paddingBottom: 0, backgroundColor: '#fff' },
    searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, backgroundColor: '#fafafa' },
    filterSection: { padding: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0', marginRight: 8 },
    filterChipActive: { backgroundColor: '#6C63FF' },
    natureChip: { backgroundColor: '#F3E5F5' },
    natureChipActive: { backgroundColor: '#9C27B0' },
    filterChipText: { fontSize: 12, color: '#333' },
    sortSection: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    sortChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f5f5f5', marginRight: 8 },
    sortChipActive: { backgroundColor: '#E8EAF6' },
    sortChipText: { fontSize: 12, color: '#999' },
    sortChipTextActive: { color: '#6C63FF', fontWeight: 'bold' },
    list: { padding: 16 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 18, color: '#666', marginBottom: 8 },
    emptyHint: { fontSize: 14, color: '#999', textAlign: 'center' },
});
