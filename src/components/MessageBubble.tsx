import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props { role: 'user' | 'assistant'; content: string; timestamp: Date; animate?: boolean; }

export default function MessageBubble({ role, content, timestamp, animate = false }: Props) {
    const isUser = role === 'user';
    const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
    const translateX = useRef(new Animated.Value(animate ? (isUser ? 20 : -20) : 0)).current;

    useEffect(() => {
        if (!animate) return;
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer, { opacity, transform: [{ translateX }] }]}>
            {!isUser && <View style={styles.avatar}><Text style={styles.avatarText}>E</Text></View>}
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
                <Text selectable style={[styles.text, isUser ? styles.userText : styles.aiText]}>{content}</Text>
                <Text style={[styles.time, isUser ? styles.userTime : styles.aiTime]}>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    userContainer: { justifyContent: 'flex-end' },
    aiContainer: { justifyContent: 'flex-start' },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
    userBubble: { backgroundColor: '#6C63FF', borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' },
    text: { fontSize: 16, lineHeight: 22 },
    userText: { color: '#fff' },
    aiText: { color: '#333' },
    time: { fontSize: 11, marginTop: 4 },
    userTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
    aiTime: { color: '#999' },
});
