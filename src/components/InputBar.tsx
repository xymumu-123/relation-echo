import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props { onSend: (text: string) => void; disabled?: boolean; }

export default function InputBar({ onSend, disabled }: Props) {
    const [text, setText] = useState('');
    const hasContent = text.trim().length > 0;
    const handleSend = () => { if (hasContent && !disabled) { onSend(text.trim()); setText(''); } };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.iconBtn}>
                <Text style={styles.icon}>语音</Text>
            </TouchableOpacity>
            <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="说点什么..."
                multiline
                maxLength={2000}
                editable={!disabled}
            />
            <TouchableOpacity style={styles.iconBtn}>
                <Text style={styles.icon}>表情</Text>
            </TouchableOpacity>
            {hasContent ? (
                <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={disabled}>
                    <Text style={styles.sendText}>{disabled ? '...' : '发送'}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.iconBtn}>
                    <Text style={styles.icon}>+</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' },
    iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    icon: { fontSize: 13, color: '#666' },
    input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, maxHeight: 100, backgroundColor: '#f9f9f9', marginHorizontal: 6 },
    sendBtn: { backgroundColor: '#6C63FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    sendText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
