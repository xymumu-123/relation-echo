import React, { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MessageBubble from '../components/MessageBubble';
import InputBar from '../components/InputBar';
import { agentLoop } from '../core/agent-loop';
import { sessionManager } from '../core/session-manager';
import { llmClient } from '../api/llm-client';
import { vectorStore } from '../memory/vector-store';
import { relationshipEngine } from '../relationship/relationship-engine';
import { characterMoodEngine } from '../mood/character-mood';
import { userProfileManager } from '../profile/user-profile';
import { formatPersonaForPrompt, CharacterPersona } from '../personality/character';
import { queryOne, query } from '../database/db';
import { Character, Relationship, SessionSummary } from '../database/schema';

interface DisplayMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; isNew?: boolean; }

const LEVEL_NAMES = ['陌生', '熟悉', '信任', '亲密', '挚友'];

export default function ChatScreen({ route }: any) {
    const { characterId } = route.params;
    const navigation = useNavigation<any>();
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [characterName, setCharacterName] = useState('');
    const [persona, setPersona] = useState<CharacterPersona | null>(null);
    const [relationship, setRelationship] = useState<Relationship | null>(null);
    const [summaries, setSummaries] = useState<SessionSummary[]>([]);
    const [showSummary, setShowSummary] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            queryOne<Character>('SELECT * FROM characters WHERE id = ?', [characterId]).then(async char => {
                if (!char || cancelled) return;
                const p: CharacterPersona = JSON.parse(char.data);
                setPersona(p);
                setCharacterName(p.partA.identity.name);
                const initialLevel = relationshipEngine.getInitialLevel(p.partC.relationship_to_user);
                const rel = await relationshipEngine.getOrCreate(characterId, initialLevel);
                if (cancelled) return;
                setRelationship(rel);

                const sessions = await queryOne<{ id: number }>('SELECT id FROM sessions WHERE character_id = ? ORDER BY id DESC LIMIT 1', [characterId]);
                if (cancelled) return;
                if (sessions) {
                    setSessionId(sessions.id);
                    const sums = await query<SessionSummary>('SELECT * FROM session_summaries WHERE session_id = ? ORDER BY id DESC LIMIT 10', [sessions.id]);
                    if (!cancelled) setSummaries(sums);
                    const msgs = await query<{ content: string; role: string; sent_at: string }>('SELECT role, content, sent_at FROM messages WHERE session_id = ? ORDER BY id', [sessions.id]);
                    if (cancelled) return;
                    if (msgs.length > 0) {
                        const display: DisplayMessage[] = [];
                        let idx = 0;
                        for (const m of msgs) {
                            if (m.role === 'assistant') {
                                const segments = m.content.split(/\n\n+/).filter(s => s.trim());
                                for (const seg of segments) {
                                    display.push({ id: `ai-${idx++}`, role: 'assistant', content: seg.trim(), timestamp: new Date(m.sent_at) });
                                }
                            } else {
                                display.push({ id: `user-${idx++}`, role: 'user', content: m.content, timestamp: new Date(m.sent_at) });
                            }
                        }
                        display.reverse();
                        setMessages(display);
                    }
                }
            });
            return () => { cancelled = true; };
        }, [characterId])
    );

    const ensureSession = useCallback(async (): Promise<number> => {
        if (sessionId) return sessionId;
        const id = await sessionManager.createSession(characterId, '新对话');
        setSessionId(id);
        return id;
    }, [sessionId, characterId]);

    const handleSend = useCallback(async (text: string) => {
        if (!text.trim() || !persona) return;
        const sid = await ensureSession();
        const userMsg: DisplayMessage = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date(), isNew: true };
        setMessages(prev => [userMsg, ...prev]);
        try {
            await sessionManager.addMessage(sid, 'user', text);
            const workingMemory = await sessionManager.getWorkingMemory(sid);
            if (!llmClient.isConfigured()) await llmClient.loadConfig();
            const relevantMemories = await vectorStore.hybridSearch(text, [], 5, characterId);
            const rel = await relationshipEngine.getOrCreate(characterId);
            const mood = await characterMoodEngine.getCurrentMood(characterId);
            const profileSummary = await userProfileManager.getProfileSummary(-1);
            const contextInput = { characterName: persona.partA.identity.name, characterPersona: formatPersonaForPrompt(persona), workingMemory, relevantMemories, userProfileSummary: profileSummary, relationship: rel, mood, currentMessage: text };
            const response = await agentLoop.process(sid, characterId, text, contextInput);
            // 分段显示
            const segments = response.content.split(/\n\n+/).filter(s => s.trim());
            for (let i = 0; i < segments.length; i++) {
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
                const aiMsg: DisplayMessage = { id: `ai-${Date.now()}-${i}`, role: 'assistant', content: segments[i].trim(), timestamp: new Date(), isNew: true };
                setMessages(prev => [aiMsg, ...prev]);
            }
            await sessionManager.addMessage(sid, 'assistant', response.content);
            const userEmotion = characterMoodEngine.analyzeUserEmotion(text);
            if (userEmotion) characterMoodEngine.respondToUserEmotion(characterId, userEmotion).catch(console.error);
            const updatedRel = await relationshipEngine.recordInteraction(characterId);
            setRelationship(updatedRel);
            if ((updatedRel as any)._levelUp) {
                const newLevel = LEVEL_NAMES[updatedRel.level] || '未知';
                Alert.alert('关系升级', `你和${characterName}的关系升级为「${newLevel}」！`);
            }
            characterMoodEngine.tickMood(characterId).catch(console.error);
        } catch (error: any) {
            Alert.alert('发送失败', error.message || '请检查API配置');
        }
    }, [sessionId, ensureSession, characterId, characterName, persona]);

    const levelName = relationship ? LEVEL_NAMES[relationship.level] || '陌生' : '陌生';

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            {/* 顶部栏 */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← 返回</Text>
                </TouchableOpacity>
                <Text style={styles.characterName}>{characterName}</Text>
                <View style={[styles.levelBadge, { backgroundColor: levelColors[relationship?.level || 0] }]}>
                    <Text style={styles.levelText}>{levelName}</Text>
                </View>
                {relationship && (
                    <Text style={styles.interactionCount}>{relationship.total_interactions}次</Text>
                )}
            </View>
            {summaries.length > 0 && (
                <TouchableOpacity onPress={() => setShowSummary(!showSummary)} style={styles.summaryToggle}>
                    <Text style={styles.summaryTitle}>对话摘要 ({summaries.length})</Text>
                    <Text style={styles.summaryArrow}>{showSummary ? '▲' : '▼'}</Text>
                </TouchableOpacity>
            )}
            {showSummary && (
                <View style={styles.summaryList}>
                    {summaries.map(s => (
                        <View key={s.id} style={styles.summaryItem}>
                            <Text style={styles.summaryText}>{s.summary}</Text>
                            <Text style={styles.summaryTime}>{new Date(s.created_at!).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>
            )}
            <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} renderItem={({ item }) => <MessageBubble role={item.role} content={item.content} timestamp={item.timestamp} animate={item.isNew} />} contentContainerStyle={styles.messageList} style={{ flex: 1 }} inverted />
            <InputBar onSend={handleSend} />
        </KeyboardAvoidingView>
    );
}

const levelColors: Record<number, string> = { 0: '#9E9E9E', 1: '#4CAF50', 2: '#2196F3', 3: '#FF9800', 4: '#E91E63' };

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backBtn: { marginRight: 8, paddingVertical: 4, paddingHorizontal: 8 },
    backText: { fontSize: 15, color: '#6C63FF' },
    characterName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginRight: 8 },
    levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
    levelText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
    interactionCount: { fontSize: 12, color: '#999' },
    summaryToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f0eff5', borderBottomWidth: 1, borderBottomColor: '#e0dfe6' },
    summaryTitle: { fontSize: 13, color: '#6C63FF', fontWeight: 'bold' },
    summaryArrow: { fontSize: 12, color: '#6C63FF' },
    summaryList: { backgroundColor: '#f8f7fc', borderBottomWidth: 1, borderBottomColor: '#e0dfe6' },
    summaryItem: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
    summaryText: { fontSize: 13, color: '#555', lineHeight: 18 },
    summaryTime: { fontSize: 11, color: '#999', marginTop: 2 },
    messageList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
});
