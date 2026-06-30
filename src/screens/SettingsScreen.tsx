import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { llmClient } from '../api/llm-client';
import { tokenTracker } from '../api/token-tracker';
import { ApiConfig } from '../database/schema';

export default function SettingsScreen() {
    const [configs, setConfigs] = useState<ApiConfig[]>([]);
    const [stats, setStats] = useState({ totalCost: 0, totalPromptTokens: 0, totalCompletionTokens: 0 });
    const [showForm, setShowForm] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
    const [testResults, setTestResults] = useState<Record<number, { chat?: string; embed?: string }>>({});

    // 表单状态
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formApiKey, setFormApiKey] = useState('');
    const [formBaseUrl, setFormBaseUrl] = useState('https://api.openai.com/v1');
    const [formModel, setFormModel] = useState('gpt-4o-mini');
    const [formEmbedModel, setFormEmbedModel] = useState('text-embedding-3-small');
    const [formEmbedUrl, setFormEmbedUrl] = useState('');
    const [formEmbedKey, setFormEmbedKey] = useState('');
    const [formInputPrice, setFormInputPrice] = useState('');
    const [formOutputPrice, setFormOutputPrice] = useState('');
    const [testing, setTesting] = useState(false);

    const loadData = useCallback(async () => {
        const cfgs = await llmClient.getAllConfigs();
        setConfigs(cfgs);
        const s = await tokenTracker.getTotalStats();
        setStats(s);
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const resetForm = () => {
        setFormName(''); setFormDesc(''); setFormApiKey(''); setFormBaseUrl('https://api.openai.com/v1');
        setFormModel('gpt-4o-mini'); setFormEmbedModel('text-embedding-3-small'); setFormEmbedUrl(''); setFormEmbedKey('');
        setFormInputPrice(''); setFormOutputPrice('');
        setEditingConfig(null);
    };

    const openAddForm = () => { resetForm(); setShowForm(true); };

    const openEditForm = (config: ApiConfig) => {
        setEditingConfig(config);
        setFormName(config.name);
        setFormDesc(config.description || '');
        setFormApiKey(config.api_key);
        setFormBaseUrl(config.base_url);
        setFormModel(config.model);
        setFormEmbedModel(config.embedding_model || '');
        setFormEmbedUrl(config.embedding_base_url || '');
        setFormEmbedKey(config.embedding_api_key || '');
        setFormInputPrice(config.input_price ? String(config.input_price) : '');
        setFormOutputPrice(config.output_price ? String(config.output_price) : '');
        setShowForm(true);
    };

    const saveConfig = async () => {
        if (!formName.trim() || !formApiKey.trim() || !formBaseUrl.trim() || !formModel.trim()) {
            Alert.alert('错误', '请填写名称、API Key、Base URL 和模型名'); return;
        }
        try {
            await llmClient.saveConfig({
                id: editingConfig?.id,
                name: formName.trim(),
                description: formDesc.trim(),
                api_key: formApiKey.trim(),
                base_url: formBaseUrl.trim(),
                model: formModel.trim(),
                embedding_model: formEmbedModel.trim() || undefined,
                embedding_base_url: formEmbedUrl.trim() || undefined,
                embedding_api_key: formEmbedKey.trim() || undefined,
                input_price: formInputPrice ? parseFloat(formInputPrice) : 0,
                output_price: formOutputPrice ? parseFloat(formOutputPrice) : 0,
            });
            setShowForm(false);
            resetForm();
            await loadData();
            Alert.alert('成功', '配置已保存');
        } catch (error: any) { Alert.alert('保存失败', error.message); }
    };

    const switchConfig = async (id: number) => {
        await llmClient.setActiveConfig(id);
        await loadData();
    };

    const deleteConfig = (config: ApiConfig) => {
        Alert.alert('确认删除', `删除配置 "${config.name}"？`, [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: async () => {
                await llmClient.deleteConfig(config.id!);
                await loadData();
            }},
        ]);
    };

    const testConfig = async (config: ApiConfig) => {
        setTesting(true);
        setTestResults(prev => ({ ...prev, [config.id!]: { chat: '测试中...', embed: '测试中...' } }));

        const chatResult = await llmClient.testChat(config);
        const embedResult = await llmClient.testEmbed(config);

        setTestResults(prev => ({
            ...prev,
            [config.id!]: {
                chat: chatResult.ok ? 'OK' : `失败: ${chatResult.error}`,
                embed: embedResult.ok ? 'OK' : `失败: ${embedResult.error}`,
            },
        }));
        setTesting(false);
    };

    return (
        <ScrollView style={styles.container}>
            {/* 模型配置列表 */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>模型配置</Text>
                    <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
                        <Text style={styles.addButtonText}>+ 添加</Text>
                    </TouchableOpacity>
                </View>

                {configs.length === 0 ? (
                    <Text style={styles.emptyText}>暂无配置，请点击"添加"</Text>
                ) : configs.map(config => (
                    <View key={config.id} style={[styles.configCard, config.is_active ? styles.activeCard : null]}>
                        <TouchableOpacity style={styles.configMain} onPress={() => switchConfig(config.id!)}>
                            <View style={styles.configHeader}>
                                <Text style={styles.configName}>{config.name}</Text>
                                {config.is_active ? <Text style={styles.activeBadge}>当前</Text> : null}
                            </View>
                            {config.description ? <Text style={styles.configDesc}>{config.description}</Text> : null}
                            <Text style={styles.configDetail}>Chat: {config.model}</Text>
                            <Text style={styles.configDetail}>Embed: {config.embedding_model || '(未设置)'}</Text>
                            {config.input_price ? <Text style={styles.configDetail}>计价: ${config.input_price}/${config.output_price} 每百万Token</Text> : null}
                        </TouchableOpacity>

                        {/* 测试结果 */}
                        {testResults[config.id!] && (
                            <View style={styles.testResults}>
                                <Text style={styles.testLine}>Chat: {testResults[config.id!]?.chat}</Text>
                                <Text style={styles.testLine}>Embed: {testResults[config.id!]?.embed}</Text>
                            </View>
                        )}

                        <View style={styles.configActions}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => testConfig(config)} disabled={testing}>
                                <Text style={styles.actionText}>测试</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(config)}>
                                <Text style={styles.actionText}>编辑</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => deleteConfig(config)}>
                                <Text style={[styles.actionText, { color: '#e53935' }]}>删除</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>

            {/* 用量统计 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>用量统计</Text>
                <View style={styles.statRow}><Text style={styles.statLabel}>Prompt Tokens</Text><Text style={styles.statValue}>{stats.totalPromptTokens.toLocaleString()}</Text></View>
                <View style={styles.statRow}><Text style={styles.statLabel}>Completion Tokens</Text><Text style={styles.statValue}>{stats.totalCompletionTokens.toLocaleString()}</Text></View>
                <View style={styles.statRow}><Text style={styles.statLabel}>预估费用</Text><Text style={styles.statValue}>${stats.totalCost.toFixed(4)}</Text></View>
            </View>

            {/* 关于 */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>关于</Text>
                <Text style={styles.about}>Echo - 情感陪伴AI</Text>
                <Text style={styles.version}>版本 1.0.0</Text>
            </View>

            {/* 配置表单 Modal */}
            <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
                <ScrollView style={styles.formContainer}>
                    <View style={styles.formHeader}>
                        <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                            <Text style={styles.formCancel}>取消</Text>
                        </TouchableOpacity>
                        <Text style={styles.formTitle}>{editingConfig ? '编辑配置' : '添加配置'}</Text>
                        <TouchableOpacity onPress={saveConfig}>
                            <Text style={styles.formSave}>保存</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.formLabel}>配置名称</Text>
                    <TextInput style={styles.formInput} value={formName} onChangeText={setFormName} placeholder="如：OpenAI GPT-4o" />
                    <Text style={styles.formLabel}>描述（可选）</Text>
                    <TextInput style={styles.formInput} value={formDesc} onChangeText={setFormDesc} placeholder="备注信息" />

                    <Text style={styles.formSectionTitle}>聊天模型</Text>
                    <Text style={styles.formLabel}>API Key</Text>
                    <TextInput style={styles.formInput} value={formApiKey} onChangeText={setFormApiKey} placeholder="sk-..." secureTextEntry autoCapitalize="none" />
                    <Text style={styles.formLabel}>Base URL</Text>
                    <TextInput style={styles.formInput} value={formBaseUrl} onChangeText={setFormBaseUrl} placeholder="https://api.openai.com/v1" autoCapitalize="none" />
                    <Text style={styles.formLabel}>模型名</Text>
                    <TextInput style={styles.formInput} value={formModel} onChangeText={setFormModel} placeholder="gpt-4o-mini" autoCapitalize="none" />

                    <Text style={styles.formSectionTitle}>向量模型（可独立配置）</Text>
                    <Text style={styles.formLabel}>Embedding 模型名</Text>
                    <TextInput style={styles.formInput} value={formEmbedModel} onChangeText={setFormEmbedModel} placeholder="text-embedding-3-small" autoCapitalize="none" />
                    <Text style={styles.formLabel}>Embedding Base URL（留空则同聊天）</Text>
                    <TextInput style={styles.formInput} value={formEmbedUrl} onChangeText={setFormEmbedUrl} placeholder="留空使用聊天模型的URL" autoCapitalize="none" />
                    <Text style={styles.formLabel}>Embedding API Key（留空则同聊天）</Text>
                    <TextInput style={styles.formInput} value={formEmbedKey} onChangeText={setFormEmbedKey} placeholder="留空使用聊天模型的Key" secureTextEntry autoCapitalize="none" />

                    <Text style={styles.formSectionTitle}>计价（每百万 Token，单位：美元）</Text>
                    <Text style={styles.formLabel}>输入价格</Text>
                    <TextInput style={styles.formInput} value={formInputPrice} onChangeText={setFormInputPrice} placeholder="如：0.15" keyboardType="decimal-pad" />
                    <Text style={styles.formLabel}>输出价格</Text>
                    <TextInput style={styles.formInput} value={formOutputPrice} onChangeText={setFormOutputPrice} placeholder="如：0.60" keyboardType="decimal-pad" />

                    <View style={{ height: 40 }} />
                </ScrollView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    section: { backgroundColor: '#fff', marginTop: 16, padding: 16, borderRadius: 8, marginHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    addButton: { backgroundColor: '#6C63FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    addButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 16 },
    configCard: { borderRadius: 8, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
    activeCard: { borderColor: '#6C63FF', borderWidth: 2 },
    configMain: { padding: 12 },
    configHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    configName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    activeBadge: { fontSize: 11, color: '#fff', backgroundColor: '#6C63FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8, overflow: 'hidden' },
    configDesc: { fontSize: 13, color: '#666', marginBottom: 4 },
    configDetail: { fontSize: 12, color: '#999' },
    testResults: { paddingHorizontal: 12, paddingBottom: 8 },
    testLine: { fontSize: 12, color: '#666' },
    configActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    actionBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f0f0f0' },
    actionText: { fontSize: 14, color: '#6C63FF' },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    statLabel: { fontSize: 14, color: '#666' },
    statValue: { fontSize: 14, color: '#333', fontWeight: 'bold' },
    about: { fontSize: 16, color: '#333' },
    version: { fontSize: 14, color: '#999', marginTop: 4 },
    // Form styles
    formContainer: { flex: 1, backgroundColor: '#fff' },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    formCancel: { fontSize: 16, color: '#999' },
    formTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    formSave: { fontSize: 16, color: '#6C63FF', fontWeight: 'bold' },
    formSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 8, paddingHorizontal: 16 },
    formLabel: { fontSize: 14, color: '#666', marginBottom: 4, marginTop: 12, paddingHorizontal: 16 },
    formInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa', marginHorizontal: 16 },
});
