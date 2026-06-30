import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Relationship } from '../database/schema';

interface Props { relationship: Relationship; }

const levelNames = ['陌生', '熟悉', '信任', '亲密', '挚友'];
const levelColors = ['#ccc', '#8BC34A', '#2196F3', '#9C27B0', '#FF5722'];

export default function RelationshipBadge({ relationship }: Props) {
    const level = relationship.level;
    const color = levelColors[level] || '#ccc';
    return (
        <View style={styles.container}>
            <View style={[styles.levelBadge, { backgroundColor: color }]}><Text style={styles.levelText}>{levelNames[level] || '未知'}</Text></View>
            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>亲密度</Text>
                    <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${relationship.intimacy * 100}%`, backgroundColor: '#E91E63' }]} /></View>
                    <Text style={styles.statValue}>{(relationship.intimacy * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>信任度</Text>
                    <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${relationship.trust * 100}%`, backgroundColor: '#2196F3' }]} /></View>
                    <Text style={styles.statValue}>{(relationship.trust * 100).toFixed(0)}%</Text>
                </View>
            </View>
            <Text style={styles.interactions}>共 {relationship.total_interactions} 次对话</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#eee' },
    levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
    levelText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    stats: { gap: 8 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statLabel: { fontSize: 14, color: '#666', width: 50 },
    progressBar: { flex: 1, height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    statValue: { fontSize: 14, color: '#333', width: 40, textAlign: 'right' },
    interactions: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' },
});
