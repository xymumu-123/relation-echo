import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MemoryNode } from '../database/schema';
import { memorySystem, MemoryTags } from '../memory/memory-system';
import { vectorStore } from '../memory/vector-store';

const NATURE_OPTIONS = ['事实信息', '个人偏好', '事件经历', '情绪感受', '知识技能', '人际动态', '目标计划'];

interface Props {
    memory: MemoryNode;
    onUpdate?: () => void;
    onDelete?: () => void;
}

export default function MemoryCard({ memory, onUpdate, onDelete }: Props) {
    const [editVisible, setEditVisible] = useState(false);
    const [editContent, setEditContent] = useState(memory.content);
    const [editFactualTags, setEditFactualTags] = useState(memory.tags.factual.join(', '));
    const [editNatureTags, setEditNatureTags] = useState<string[]>(memory.tags.nature || []);
    const [saving, setSaving] = useState(false);

    const decayedWeight = memorySystem.getDecayedWeight(memory);
    const factualTags = memory.tags.factual || [];
    const natureTags = memory.tags.nature || [];
    const source = memory.tags.source;
    const sourceLabel = source === 'user' ? '用户' : source === 'ai' ? 'AI' : source === 'cross' ? '交叉' : null;
    const sourceStyle = source === 'user' ? styles.sourceUser : source === 'ai' ? styles.sourceAi : styles.sourceCross;

    const openEdit = () => {
        setEditContent(memory.content);
        setEditFactualTags(memory.tags.factual.join(', '));
        setEditNatureTags(memory.tags.nature || []);
        setEditVisible(true);
    };

    const toggleNature = (tag: string) => {
        setEditNatureTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSave = async () => {
        if (!editContent.trim()) return;
        setSaving(true);
        try {
            const tags: MemoryTags = {
                factual: editFactualTags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
                nature: editNatureTags,
                source: memory.tags.source,
            };
            const contentChanged = editContent !== memory.content;
            await memorySystem.updateMemory(memory.id, editContent.trim(), tags);
            if (contentChanged) {
                await vectorStore.embedAndStore(memory.id, editContent.trim());
            }
            setEditVisible(false);
            onUpdate?.();
        } catch (error) {
            console.error('[MemoryCard] Save failed:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('删除记忆', '确定要删除这条记忆吗？此操作不可撤销。', [
            { text: '取消', style: 'cancel' },
            {
                text: '删除', style: 'destructive', onPress: async () => {
                    try {
                        await memorySystem.deleteMemory(memory.id);
                        onDelete?.();
                    } catch (error) {
                        console.error('[MemoryCard] Delete failed:', error);
                    }
                }
            },
        ]);
    };

    return (
        <>
            <TouchableOpacity style={styles.card} onPress={openEdit} activeOpacity={0.7}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.weight}>权重: {(decayedWeight * 100).toFixed(0)}%</Text>
                        {sourceLabel && <Text style={[styles.sourceTag, sourceStyle]}>{sourceLabel}</Text>}
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.accessCount}>访问 {memory.access_count} 次</Text>
                        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={styles.deleteBtn}>删除</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.content} numberOfLines={3}>{memory.content}</Text>

                {factualTags.length > 0 && (
                    <View style={styles.tagSection}>
                        <Text style={styles.tagLabel}>据实标签</Text>
                        <View style={styles.tags}>
                            {factualTags.map((tag, i) => (
                                <View key={i} style={styles.factualTag}><Text style={styles.tagText}>{tag}</Text></View>
                            ))}
                        </View>
                    </View>
                )}

                {natureTags.length > 0 && (
                    <View style={styles.tagSection}>
                        <Text style={styles.tagLabel}>记忆分类</Text>
                        <View style={styles.tags}>
                            {natureTags.map((tag, i) => (
                                <View key={i} style={styles.natureTag}><Text style={styles.tagText}>{tag}</Text></View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.footer}>
                    {memory.last_accessed && (
                        <Text style={styles.meta}>最后访问: {new Date(memory.last_accessed).toLocaleDateString()}</Text>
                    )}
                    {memory.created_at && (
                        <Text style={styles.meta}>创建: {new Date(memory.created_at).toLocaleDateString()}</Text>
                    )}
                </View>
            </TouchableOpacity>

            <Modal visible={editVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            <Text style={styles.modalTitle}>编辑记忆</Text>

                            <Text style={styles.modalLabel}>内容</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editContent}
                                onChangeText={setEditContent}
                                multiline
                                placeholder="记忆内容"
                            />

                            <Text style={styles.modalLabel}>据实标签（逗号分隔）</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={editFactualTags}
                                onChangeText={setEditFactualTags}
                                placeholder="标签1, 标签2, 标签3"
                            />

                            <Text style={styles.modalLabel}>记忆分类</Text>
                            <View style={styles.naturePicker}>
                                {NATURE_OPTIONS.map(tag => (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[styles.natureOption, editNatureTags.includes(tag) && styles.natureOptionActive]}
                                        onPress={() => toggleNature(tag)}
                                    >
                                        <Text style={[styles.natureOptionText, editNatureTags.includes(tag) && styles.natureOptionTextActive]}>{tag}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                                <Text style={styles.cancelBtnText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>保存</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    weight: { fontSize: 14, fontWeight: 'bold', color: '#6C63FF' },
    accessCount: { fontSize: 12, color: '#999' },
    deleteBtn: { fontSize: 12, color: '#E53935' },
    sourceTag: { fontSize: 11, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, overflow: 'hidden' },
    sourceUser: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
    sourceAi: { backgroundColor: '#FFF3E0', color: '#E65100' },
    sourceCross: { backgroundColor: '#E3F2FD', color: '#1565C0' },
    content: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 8 },
    tagSection: { marginBottom: 8 },
    tagLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    factualTag: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    natureTag: { backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    tagText: { fontSize: 12, color: '#333' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    meta: { fontSize: 12, color: '#999' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
    modalLabel: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 12 },
    modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fafafa', minHeight: 40 },
    naturePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    natureOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0' },
    natureOptionActive: { backgroundColor: '#9C27B0' },
    natureOptionText: { fontSize: 12, color: '#666' },
    natureOptionTextActive: { color: '#fff', fontWeight: 'bold' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
    cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f0f0f0' },
    cancelBtnText: { fontSize: 14, color: '#666' },
    saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#6C63FF' },
    saveBtnText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
});
