import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { query } from '../database/db';
import { Character, Relationship } from '../database/schema';
import { CharacterPersona } from '../personality/character';
import { relationshipEngine } from '../relationship/relationship-engine';

const LEVEL_NAMES = ['陌生', '熟悉', '信任', '亲密', '挚友'];
const LEVEL_COLORS: Record<number, string> = { 0: '#9E9E9E', 1: '#4CAF50', 2: '#2196F3', 3: '#FF9800', 4: '#E91E63' };

interface ConversationItem {
    characterId: number;
    name: string;
    persona: CharacterPersona;
    lastMessage: string;
    lastTime: string;
    relationship: Relationship | null;
}

export default function ConversationListScreen() {
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                const rows = await query<any>(
                    `SELECT c.id, c.name, c.data,
                        (SELECT m.content FROM messages m JOIN sessions s ON m.session_id = s.id
                         WHERE s.character_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message,
                        (SELECT m.sent_at FROM messages m JOIN sessions s ON m.session_id = s.id
                         WHERE s.character_id = c.id ORDER BY m.id DESC LIMIT 1) as last_time,
                        r.level as rel_level, r.intimacy, r.trust, r.total_interactions, r.call_name
                     FROM characters c
                     LEFT JOIN relationships r ON r.character_id = c.id
                     ORDER BY last_time DESC`
                );
                if (cancelled) return;

                const items: ConversationItem[] = rows.map((row: any) => {
                    const persona: CharacterPersona = JSON.parse(row.data);
                    return {
                        characterId: row.id,
                        name: row.name,
                        persona,
                        lastMessage: row.last_message || '还没有对话',
                        lastTime: row.last_time || '',
                        relationship: row.rel_level != null ? {
                            level: row.rel_level, intimacy: row.intimacy, trust: row.trust,
                            total_interactions: row.total_interactions, call_name: row.call_name,
                        } as Relationship : null,
                    };
                });

                if (!cancelled) setConversations(items);
            })();
            return () => { cancelled = true; };
        }, [])
    );

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        try {
            const date = new Date(timeStr);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            if (isToday) return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) return '昨天';
            return `${date.getMonth() + 1}/${date.getDate()}`;
        } catch { return ''; }
    };

    const renderItem = ({ item }: { item: ConversationItem }) => {
        const level = item.relationship?.level || 0;
        const levelName = LEVEL_NAMES[level] || '陌生';
        const levelColor = LEVEL_COLORS[level] || '#9E9E9E';
        const initial = item.name.charAt(0);

        return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ChatDetail', { characterId: item.characterId })}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.time}>{formatTime(item.lastTime)}</Text>
                    </View>
                    <View style={styles.bottomRow}>
                        <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
                        <View style={[styles.badge, { backgroundColor: levelColor }]}>
                            <Text style={styles.badgeText}>{levelName}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {conversations.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>还没有对话</Text>
                    <Text style={styles.emptyHint}>去角色页面创建一个角色吧</Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={item => String(item.characterId)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    list: { paddingVertical: 8 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, padding: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    content: { flex: 1 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
    time: { fontSize: 12, color: '#999', marginLeft: 8 },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMsg: { fontSize: 13, color: '#999', flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    badgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 18, color: '#999', marginBottom: 8 },
    emptyHint: { fontSize: 14, color: '#bbb' },
});
