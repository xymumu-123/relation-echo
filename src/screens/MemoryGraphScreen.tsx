import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MemoryGraph from '../components/MemoryGraph';
import { buildGraphData, GraphData } from '../memory/graph-data';
import { query } from '../database/db';
import { Character } from '../database/schema';

interface CharacterInfo { id: number; name: string; }

export default function MemoryGraphScreen() {
    const navigation = useNavigation();
    const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);
    const [characters, setCharacters] = useState<CharacterInfo[]>([]);
    const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
    const insets = useSafeAreaInsets();

    useFocusEffect(useCallback(() => {
        let cancelled = false;
        query<Character>('SELECT id, name FROM characters ORDER BY id').then(chars => {
            if (!cancelled) setCharacters(chars.map(c => ({ id: c.id!, name: c.name })));
        });
        return () => { cancelled = true; };
    }, []));

    useFocusEffect(useCallback(() => {
        let cancelled = false;
        setLoading(true);
        buildGraphData(selectedCharId || undefined).then(result => {
            if (!cancelled) {
                setData(result);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [selectedCharId]));

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>返回</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>记忆图谱</Text>
                <View style={styles.backBtn} />
            </View>

            {/* Character selector */}
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

            <View style={styles.stats}>
                <Text style={styles.statsText}>{data.nodes.length} 个节点 · {data.edges.length} 条连接</Text>
                <Text style={styles.statsHint}>连接 = 共享标签</Text>
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#6C63FF" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.graphContainer}>
                    <MemoryGraph data={data} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#6C63FF' },
    backBtn: { width: 50 },
    backText: { color: '#fff', fontSize: 15 },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    charSection: { paddingVertical: 8, paddingHorizontal: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    charChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0', marginRight: 8 },
    charChipActive: { backgroundColor: '#6C63FF' },
    charChipText: { fontSize: 13, color: '#666' },
    charChipTextActive: { color: '#fff', fontWeight: 'bold' },
    stats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    statsText: { fontSize: 14, color: '#333', fontWeight: 'bold' },
    statsHint: { fontSize: 12, color: '#999' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    graphContainer: { alignItems: 'center', paddingVertical: 8 },
});
