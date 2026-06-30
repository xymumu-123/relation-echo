import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { getDatabase, resetDatabase } from './src/database/db';
import { runMigrations } from './src/database/migrations';
import { llmClient } from './src/api/llm-client';
import './src/tools/web-search';
import './src/tools/web-fetch';

// 设为 true 启动时清空数据库重建（api_configs 会保留），调试用
const RESET_DB = false;

export default function App() {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { initApp(); }, []);

    async function initApp() {
        try {
            if (RESET_DB) await resetDatabase();
            await getDatabase();
            await runMigrations();
            await llmClient.loadConfig();
            setReady(true);
        } catch (e: any) { setError(e.message || '初始化失败'); }
    }

    if (error) return (<View style={styles.center}><Text style={styles.errorText}>启动失败</Text><Text style={styles.errorDetail}>{error}</Text></View>);
    if (!ready) return (<View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /><Text style={styles.loadingText}>正在初始化...</Text></View>);

    return (<><StatusBar style="light" /><AppNavigator /></>);
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
    errorText: { fontSize: 18, fontWeight: 'bold', color: '#ff4444' },
    errorDetail: { fontSize: 14, color: '#666', marginTop: 8, paddingHorizontal: 32, textAlign: 'center' },
});
