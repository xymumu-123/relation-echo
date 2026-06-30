import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { query, execute } from '../database/db';
import { Character } from '../database/schema';
import { CharacterPersona, createDefaultFemaleCharacter, createDefaultMaleCharacter, exportCharacter, importCharacter, saveCharacter } from '../personality/character';
import { parseCharacterFromText } from '../personality/character-creator';
import CharacterEditor from '../components/CharacterEditor';
import { userProfileManager, UserPersona } from '../profile/user-profile';

export default function CharacterScreen() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [editing, setEditing] = useState<{ id: number; persona: CharacterPersona } | null>(null);
    const [newMethodModal, setNewMethodModal] = useState(false);
    const [quickEditModal, setQuickEditModal] = useState<{ id: number; persona: CharacterPersona } | null>(null);
    const [quickEditText, setQuickEditText] = useState('');
    const [quickEditLoading, setQuickEditLoading] = useState(false);
    const [textModal, setTextModal] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [textLoading, setTextLoading] = useState(false);
    const [textPreview, setTextPreview] = useState<CharacterPersona | null>(null);
    const [userProfile, setUserProfile] = useState<UserPersona | null>(null);

    const loadCharacters = useCallback(async () => {
        const rows = await query<Character>('SELECT * FROM characters ORDER BY id');
        setCharacters(rows);
    }, []);

    useEffect(() => { loadCharacters(); }, [loadCharacters]);

    const loadUserProfile = useCallback(async () => {
        try {
            const profile = await userProfileManager.getOrCreate(-1);
            console.log('[CharacterScreen] Loaded profile:', JSON.stringify(profile.partA.identity));
            setUserProfile(profile);
        } catch (e: any) { console.error('[CharacterScreen] Load profile failed:', e.message); }
    }, []);

    useFocusEffect(useCallback(() => { loadUserProfile(); }, [loadUserProfile]));

    // === 新建角色（选择方式后） ===
    const createWithMethod = async (method: 'female' | 'male') => {
        const persona = method === 'female' ? createDefaultFemaleCharacter() : createDefaultMaleCharacter();
        await execute('INSERT INTO characters (name, data, is_active) VALUES (?, ?, 0)', [persona.partA.identity.name, JSON.stringify(persona)]);
        setNewMethodModal(false);
        await loadCharacters();
    };

    const deleteCharacter = (id: number, name: string) => {
        Alert.alert('确认删除', `删除角色"${name}"？`, [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: async () => {
                const wasActive = characters.find(c => c.id === id)?.is_active === 1;
                await execute('DELETE FROM characters WHERE id = ?', [id]);
                if (wasActive) {
                    const remaining = await query<Character>('SELECT id FROM characters ORDER BY id LIMIT 1');
                    if (remaining.length > 0) {
                        await execute('UPDATE characters SET is_active = 1 WHERE id = ?', [remaining[0].id]);
                    } else {
                        const fallback = createDefaultFemaleCharacter();
                        await execute('INSERT INTO characters (name, data, is_active) VALUES (?, ?, 1)', [fallback.partA.identity.name, JSON.stringify(fallback)]);
                    }
                }
                await loadCharacters();
            }},
        ]);
    };

    const setActive = async (id: number) => {
        await execute('UPDATE characters SET is_active = 0');
        await execute('UPDATE characters SET is_active = 1 WHERE id = ?', [id]);
        await loadCharacters();
    };

    const exportChar = async (char: Character) => {
        try {
            const persona: CharacterPersona = JSON.parse(char.data);
            const json = exportCharacter(persona);
            const fileUri = FileSystem.documentDirectory + `echo_character_${persona.partA.identity.name}.json`;
            await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
            await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
        } catch (error: any) { Alert.alert('导出失败', error.message); }
    };

    const importChar = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
            if (result.canceled || !result.assets?.[0]) return;
            const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
            const persona = importCharacter(content);
            if (!persona) { Alert.alert('导入失败', 'JSON 格式不正确'); return; }
            await execute('INSERT INTO characters (name, data, is_active) VALUES (?, ?, 0)', [persona.partA.identity.name, JSON.stringify(persona)]);
            await loadCharacters();
            Alert.alert('成功', `角色"${persona.partA.identity.name}"已导入`);
        } catch (error: any) { Alert.alert('导入失败', error.message); }
    };

    // === 文本解析创建（新建角色） ===
    const handleTextParse = async () => {
        if (!textInput.trim()) return;
        setTextLoading(true);
        try {
            const persona = await parseCharacterFromText(textInput);
            if (!persona) { Alert.alert('解析失败', '无法从文本中提取角色信息'); return; }
            setTextPreview(persona);
        } catch (e: any) { Alert.alert('解析失败', e.message); }
        finally { setTextLoading(false); }
    };

    const handleTextCreate = async () => {
        if (!textPreview) return;
        await execute('INSERT INTO characters (name, data, is_active) VALUES (?, ?, 0)', [textPreview.partA.identity.name, JSON.stringify(textPreview)]);
        setTextModal(false); setTextInput(''); setTextPreview(null);
        await loadCharacters();
        Alert.alert('已创建', `角色"${textPreview.partA.identity.name}"已创建`);
    };

    // === 快速编辑（文本合并到已有角色） ===
    const handleQuickEdit = async () => {
        if (!quickEditText.trim() || !quickEditModal) return;
        setQuickEditLoading(true);
        try {
            const parsed = await parseCharacterFromText(quickEditText);
            if (!parsed) { Alert.alert('解析失败', '无法从文本中提取角色信息'); return; }
            const merged = mergePersona(quickEditModal.persona, parsed);
            await saveCharacter(quickEditModal.id, merged);
            setQuickEditModal(null); setQuickEditText('');
            Alert.alert('已更新', `角色信息已补充`);
            await loadCharacters();
        } catch (e: any) { Alert.alert('解析失败', e.message); }
        finally { setQuickEditLoading(false); }
    };

    // === 用户画像导入导出 ===
    const exportUserProfile = async () => {
        if (!userProfile) return;
        try {
            const json = userProfileManager.exportProfile(userProfile);
            const fileUri = FileSystem.documentDirectory + 'echo_user_profile.json';
            await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
            await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
        } catch (error: any) { Alert.alert('导出失败', error.message); }
    };

    const exportProfileAsCharacter = async () => {
        if (!userProfile) return;
        try {
            const json = userProfileManager.exportAsCharacter(userProfile);
            const fileUri = FileSystem.documentDirectory + 'echo_user_as_character.json';
            await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
            await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
        } catch (error: any) { Alert.alert('导出失败', error.message); }
    };

    const importUserProfile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
            if (result.canceled || !result.assets?.[0]) return;
            const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
            const profile = userProfileManager.importProfile(content);
            if (!profile) { Alert.alert('导入失败', 'JSON 格式不正确'); return; }
            await userProfileManager.updateProfile(-1, profile, 'import');
            setUserProfile(profile);
            Alert.alert('成功', '用户画像已导入');
        } catch (error: any) { Alert.alert('导入失败', error.message); }
    };

    const createCharacterFromProfile = async () => {
        if (!userProfile) return;
        const json = userProfileManager.exportAsCharacter(userProfile);
        const persona = importCharacter(json);
        if (!persona) { Alert.alert('失败', '无法转换'); return; }
        await execute('INSERT INTO characters (name, data, is_active) VALUES (?, ?, 0)', [persona.partA.identity.name, JSON.stringify(persona)]);
        await loadCharacters();
        Alert.alert('已创建', `角色"${persona.partA.identity.name}"已从用户画像创建`);
    };

    // 编辑页面
    if (editing) {
        return <CharacterEditor persona={editing.persona} onSave={async (p) => { await saveCharacter(editing.id, p); setEditing(null); await loadCharacters(); }} onCancel={() => setEditing(null)} />;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>角色列表</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.importBtn} onPress={importChar}><Text style={styles.importBtnText}>导入</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setNewMethodModal(true)}><Text style={styles.addBtnText}>+ 新建</Text></TouchableOpacity>
                    </View>
                </View>
                {characters.length === 0 ? <Text style={styles.emptyText}>还没有角色</Text> : characters.map(char => {
                    const persona: CharacterPersona = JSON.parse(char.data);
                    const isActive = char.is_active === 1;
                    return (
                        <View key={char.id} style={[styles.card, isActive && styles.activeCard]}>
                            <TouchableOpacity style={styles.cardMain} onPress={() => setEditing({ id: char.id!, persona })}>
                                <Text style={styles.cardName}>{char.name} {isActive && '(当前)'}</Text>
                                <Text style={styles.cardDesc}>{(persona.partB.emotion_decision?.emotion_expression || '').slice(0, 30)}</Text>
                                <Text style={styles.cardDesc}>{persona.partB.speaking_style?.formality || ''}</Text>
                            </TouchableOpacity>
                            <View style={styles.cardActions}>
                                {!isActive && <TouchableOpacity style={styles.actionBtn} onPress={() => setActive(char.id!)}><Text style={styles.actionBtnText}>使用</Text></TouchableOpacity>}
                                <TouchableOpacity style={styles.actionBtn} onPress={() => { setQuickEditModal({ id: char.id!, persona }); setQuickEditText(''); }}><Text style={styles.actionBtnText}>快速编辑</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => exportChar(char)}><Text style={styles.actionBtnText}>导出</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => deleteCharacter(char.id!, char.name)}><Text style={[styles.actionBtnText, { color: '#e53935' }]}>删除</Text></TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* 用户画像 */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>我的画像</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.importBtn} onPress={importUserProfile}><Text style={styles.importBtnText}>导入</Text></TouchableOpacity>
                    </View>
                </View>
                {userProfile && (userProfile.partA.identity.name || userProfile.partA.identity.age || userProfile.partA.identity.occupation || userProfile.partA.identity.city) ? (
                    <>
                        <View style={styles.card}>
                            <View style={styles.cardMain}>
                                <Text style={styles.cardName}>{userProfile.partA.identity.name || '未知名字'}{userProfile.partA.identity.age ? `，${userProfile.partA.identity.age}` : ''}{userProfile.partA.identity.occupation ? `，${userProfile.partA.identity.occupation}` : ''}{userProfile.partA.identity.city ? `，${userProfile.partA.identity.city}` : ''}</Text>
                                {userProfile.partB.identity.mbti ? <Text style={styles.cardDesc}>MBTI: {userProfile.partB.identity.mbti}</Text> : null}
                                {userProfile.partA.values?.core_conflict ? <Text style={styles.cardDesc}>{userProfile.partA.values.core_conflict}</Text> : null}
                            </View>
                            <View style={styles.cardActions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={exportUserProfile}><Text style={styles.actionBtnText}>导出画像</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={exportProfileAsCharacter}><Text style={styles.actionBtnText}>导出为角色</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={createCharacterFromProfile}><Text style={styles.actionBtnText}>创建角色</Text></TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.profileHint}>画像会随对话自动积累。"导出为角色"可将画像转为可导入的角色JSON。</Text>
                    </>
                ) : (
                    <Text style={styles.emptyText}>暂无画像，对话20轮后自动生成</Text>
                )}
            </View>

            {/* 新建角色方式选择 Modal */}
            <Modal visible={newMethodModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>新建角色</Text>
                            <TouchableOpacity onPress={() => setNewMethodModal(false)}><Text style={styles.cancelText}>关闭</Text></TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.methodCard} onPress={() => { setNewMethodModal(false); setTextModal(true); }}>
                            <Text style={styles.methodIcon}>📝</Text>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>文本描述</Text>
                                <Text style={styles.methodDesc}>粘贴一段角色描述，AI自动解析</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.methodCard} onPress={() => { setNewMethodModal(false); createWithMethod('female'); }}>
                            <Text style={styles.methodIcon}>👩</Text>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>默认女性角色</Text>
                                <Text style={styles.methodDesc}>温柔善解人意的小雨</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.methodCard} onPress={() => { setNewMethodModal(false); createWithMethod('male'); }}>
                            <Text style={styles.methodIcon}>👨</Text>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>默认男性角色</Text>
                                <Text style={styles.methodDesc}>沉稳幽默的阿泽</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 文本创建 Modal */}
            <Modal visible={textModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>文本创建角色</Text>
                            <TouchableOpacity onPress={() => { setTextModal(false); setTextPreview(null); setTextInput(''); }}><Text style={styles.cancelText}>关闭</Text></TouchableOpacity>
                        </View>
                        {!textPreview ? (
                            <>
                                <Text style={styles.modalDesc}>粘贴一段角色描述，AI会自动填充所有细节</Text>
                                <TextInput style={styles.textArea} multiline numberOfLines={6} value={textInput} onChangeText={setTextInput} placeholder="例如：她叫小雨，22岁，是个温柔的大学生，喜欢画画和听音乐，说话轻声细语..." />
                                <TouchableOpacity style={[styles.parseBtn, textLoading && styles.parseBtnDisabled]} onPress={handleTextParse} disabled={textLoading}>
                                    {textLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.parseBtnText}>解析</Text>}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <ScrollView style={styles.previewScroll}>
                                <Text style={styles.previewTitle}>解析结果</Text>
                                <PreviewField label="名字" value={textPreview.partA.identity.name} />
                                <PreviewField label="年龄" value={textPreview.partA.identity.age} />
                                <PreviewField label="职业" value={textPreview.partA.identity.occupation} />
                                <PreviewField label="MBTI" value={textPreview.partB.identity.mbti} />
                                <PreviewField label="星座" value={textPreview.partB.identity.zodiac} />
                                <PreviewField label="口头禅" value={(textPreview.partB.speaking_style?.catchphrases || []).join('、')} />
                                <PreviewField label="正式程度" value={textPreview.partB.speaking_style?.formality} />
                                <PreviewField label="情感表达" value={textPreview.partB.emotion_decision?.emotion_expression} />
                                <PreviewField label="关系" value={textPreview.partC.relationship_to_user} />
                                <View style={styles.previewActions}>
                                    <TouchableOpacity style={styles.reparseBtn} onPress={() => setTextPreview(null)}><Text style={styles.reparseBtnText}>重新输入</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.applyBtn} onPress={handleTextCreate}><Text style={styles.applyBtnText}>创建</Text></TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* 快速编辑 Modal */}
            <Modal visible={!!quickEditModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>快速编辑 — {quickEditModal?.persona.partA.identity.name}</Text>
                            <TouchableOpacity onPress={() => { setQuickEditModal(null); setQuickEditText(''); }}><Text style={styles.cancelText}>关闭</Text></TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>输入要补充或修改的内容，AI会自动合并到现有角色信息中</Text>
                        <TextInput style={styles.textArea} multiline numberOfLines={6} value={quickEditText} onChangeText={setQuickEditText} placeholder={'例如：她最近换了工作，在一家设计公司做插画师，口头禅变成了"好嘞"...'} />
                        {quickEditLoading ? (
                            <View style={styles.loadingBox}><ActivityIndicator size="large" color="#6C63FF" /><Text style={styles.loadingText}>正在解析并合并...</Text></View>
                        ) : (
                            <TouchableOpacity style={[styles.parseBtn, !quickEditText.trim() && styles.parseBtnDisabled]} onPress={handleQuickEdit} disabled={!quickEditText.trim()}>
                                <Text style={styles.parseBtnText}>应用修改</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

function PreviewField({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return <View style={styles.previewField}><Text style={styles.previewLabel}>{label}</Text><Text style={styles.previewValue}>{value}</Text></View>;
}

/** 深度合并两个 persona：字符串字段非空覆盖，数组合并去重，对象递归合并 */
function mergePersona(existing: CharacterPersona, incoming: CharacterPersona): CharacterPersona {
    const mergeStr = (a: string, b: string) => b ? b : a;
    const mergeArr = (a: string[], b: string[]) => [...new Set([...a, ...b].filter(Boolean))];
    const mergeObj = (a: any, b: any): any => {
        const result: any = { ...a };
        for (const key of Object.keys(b || {})) {
            if (Array.isArray(b[key])) result[key] = mergeArr(a[key] || [], b[key]);
            else if (typeof b[key] === 'object' && b[key]) result[key] = mergeObj(a[key] || {}, b[key]);
            else if (b[key]) result[key] = mergeStr(a[key] || '', b[key]);
        }
        return result;
    };
    return {
        partA: {
            identity: mergeObj(existing.partA.identity, incoming.partA.identity),
            values: mergeObj(existing.partA.values, incoming.partA.values),
            habits: mergeObj(existing.partA.habits, incoming.partA.habits),
            important_memories: mergeArr(existing.partA.important_memories, incoming.partA.important_memories),
            relationships: mergeArr(existing.partA.relationships, incoming.partA.relationships),
            growth_trajectory: mergeObj(existing.partA.growth_trajectory, incoming.partA.growth_trajectory),
        },
        partB: {
            hard_rules: mergeArr(existing.partB.hard_rules, incoming.partB.hard_rules),
            identity: mergeObj(existing.partB.identity, incoming.partB.identity),
            speaking_style: mergeObj(existing.partB.speaking_style, incoming.partB.speaking_style),
            emotion_decision: mergeObj(existing.partB.emotion_decision, incoming.partB.emotion_decision),
            interpersonal: mergeObj(existing.partB.interpersonal, incoming.partB.interpersonal),
        },
        partC: {
            mental_models: mergeArr(existing.partC.mental_models, incoming.partC.mental_models),
            decision_heuristics: mergeArr(existing.partC.decision_heuristics, incoming.partC.decision_heuristics),
            expression_dna: mergeObj(existing.partC.expression_dna, incoming.partC.expression_dna),
            values_and_anti_patterns: {
                pursue: mergeArr(existing.partC.values_and_anti_patterns?.pursue || [], incoming.partC.values_and_anti_patterns?.pursue || []),
                reject: mergeArr(existing.partC.values_and_anti_patterns?.reject || [], incoming.partC.values_and_anti_patterns?.reject || []),
                internal_tension: mergeArr(existing.partC.values_and_anti_patterns?.internal_tension || [], incoming.partC.values_and_anti_patterns?.internal_tension || []),
            },
            honesty_boundaries: mergeArr(existing.partC.honesty_boundaries, incoming.partC.honesty_boundaries),
            relationship_to_user: mergeStr(existing.partC.relationship_to_user, incoming.partC.relationship_to_user),
            call_user_as: mergeStr(existing.partC.call_user_as, incoming.partC.call_user_as),
        },
    };
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    section: { backgroundColor: '#fff', marginTop: 12, padding: 16, borderRadius: 8, marginHorizontal: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerActions: { flexDirection: 'row', gap: 8 },
    importBtn: { borderWidth: 1, borderColor: '#6C63FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    importBtnText: { color: '#6C63FF', fontSize: 14 },
    addBtn: { backgroundColor: '#6C63FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    addBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    emptyText: { color: '#999', textAlign: 'center', padding: 20 },
    card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
    activeCard: { borderColor: '#6C63FF', borderWidth: 2 },
    cardMain: { padding: 12 },
    cardName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardDesc: { fontSize: 13, color: '#666', marginTop: 2 },
    cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f0f0f0' },
    actionBtnText: { fontSize: 14, color: '#6C63FF' },
    cancelText: { fontSize: 16, color: '#999' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    modalDesc: { fontSize: 14, color: '#666', marginBottom: 12 },
    methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    methodIcon: { fontSize: 28, marginRight: 14 },
    methodInfo: { flex: 1 },
    methodName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    methodDesc: { fontSize: 13, color: '#666', marginTop: 2 },
    textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, fontSize: 15, minHeight: 120, textAlignVertical: 'top', backgroundColor: '#fafafa' },
    parseBtn: { backgroundColor: '#6C63FF', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
    parseBtnDisabled: { opacity: 0.6 },
    parseBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    previewScroll: { maxHeight: 400 },
    previewTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    previewField: { marginBottom: 8 },
    previewLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
    previewValue: { fontSize: 15, color: '#333' },
    previewActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    reparseBtn: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 12, padding: 12, alignItems: 'center' },
    reparseBtnText: { color: '#999', fontSize: 15 },
    applyBtn: { flex: 1, backgroundColor: '#6C63FF', borderRadius: 12, padding: 12, alignItems: 'center' },
    applyBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    loadingBox: { alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 8, color: '#666', fontSize: 14 },
    profileHint: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' },
});
