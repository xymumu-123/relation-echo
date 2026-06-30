import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { storage } from '../utils/storage';
import { execute } from '../database/db';
import { CharacterPersona, createDefaultFemaleCharacter, createDefaultMaleCharacter, getActiveCharacter } from '../personality/character';
import { parseCharacterFromText, generateCharacterFromQA, generateOnboardingQuestion } from '../personality/character-creator';

type Step = 'welcome' | 'choose-gender' | 'choose-method' | 'text-input' | 'step-by-step' | 'preview';
type CreationMethod = 'text' | 'qa';

interface Props { onComplete: () => void; }

const INITIAL_QUESTIONS = [
    '你希望这个角色叫什么名字？',
    '他/她是什么样的人？性格怎么样？',
    '他/她平时怎么说话？温柔的还是直爽的？有什么口头禅吗？',
    '他/她和你是什么关系？怎么认识的？',
    '他/她有什么让你印象深刻的经历或故事吗？',
];

export default function OnboardingScreen({ onComplete }: Props) {
    const [step, setStep] = useState<Step>('welcome');
    const [loading, setLoading] = useState(false);
    const [persona, setPersona] = useState<CharacterPersona | null>(null);
    const [creationMethod, setCreationMethod] = useState<CreationMethod>('text');

    // 文本创建
    const [textInput, setTextInput] = useState('');

    // 引导式创建
    const [qaIndex, setQaIndex] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(INITIAL_QUESTIONS[0]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [answerInput, setAnswerInput] = useState('');
    const [llmQuestion, setLlmQuestion] = useState<string | null>(null);

    const finishOnboarding = async (p?: CharacterPersona) => {
        if (p) {
            await execute('INSERT INTO characters (name, data, is_active) VALUES (?, ?, 1)', [p.partA.identity.name, JSON.stringify(p)]);
        } else {
            await getActiveCharacter(); // 触发默认角色创建
        }
        await storage.set('onboarding_complete', true);
        onComplete();
    };

    // === 文本解析 ===
    const handleTextParse = async () => {
        if (!textInput.trim()) return;
        setLoading(true);
        try {
            const parsed = await parseCharacterFromText(textInput);
            if (parsed) { setPersona(parsed); setStep('preview'); }
            else { alert('无法解析角色信息，请补充更多内容'); }
        } catch (e: any) { alert('解析失败：' + e.message); }
        finally { setLoading(false); }
    };

    // === 引导式 ===
    const handleAnswer = async () => {
        if (!answerInput.trim()) return;
        const newAnswers = [...answers, answerInput.trim()];
        setAnswers(newAnswers);
        setAnswerInput('');

        if (qaIndex >= 4) {
            setLoading(true);
            try {
                const qaPairs = INITIAL_QUESTIONS.slice(0, newAnswers.length).map((q, i) => ({ question: q, answer: newAnswers[i] || '' }));
                const generated = await generateCharacterFromQA(qaPairs);
                if (generated) { setPersona(generated); setStep('preview'); }
                else { alert('生成失败，请重试'); }
            } catch (e: any) { alert('生成失败：' + e.message); }
            finally { setLoading(false); }
        } else {
            const nextIdx = qaIndex + 1;
            setQaIndex(nextIdx);
            if (nextIdx < INITIAL_QUESTIONS.length) {
                setCurrentQuestion(INITIAL_QUESTIONS[nextIdx]);
            }
            if (nextIdx >= INITIAL_QUESTIONS.length) {
                generateOnboardingQuestion(
                    [...INITIAL_QUESTIONS.slice(0, nextIdx)],
                    newAnswers
                ).then(q => {
                    if (q && !q.includes('够了')) { setLlmQuestion(q); setCurrentQuestion(q); }
                }).catch(() => {});
            }
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Welcome */}
                {step === 'welcome' && (
                    <View style={styles.centerContent}>
                        <Text style={styles.logo}>Echo</Text>
                        <Text style={styles.subtitle}>你的AI陪伴伙伴</Text>
                        <Text style={styles.desc}>Echo 会记住你说过的每一件事，随着时间越来越懂你。</Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('choose-gender')}>
                            <Text style={styles.primaryBtnText}>开始创建</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.skipBtn} onPress={() => finishOnboarding()}>
                            <Text style={styles.skipBtnText}>跳过，使用默认角色</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Choose default gender */}
                {step === 'choose-gender' && (
                    <View style={styles.centerContent}>
                        <Text style={styles.stepTitle}>选择默认角色</Text>
                        <Text style={styles.stepDesc}>或者你想自己创建一个？</Text>
                        <TouchableOpacity style={styles.methodCard} onPress={() => { const c = createDefaultFemaleCharacter(); finishOnboarding(c); }}>
                            <Text style={styles.methodIcon}>👩</Text>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>小雨（女）</Text>
                                <Text style={styles.methodDesc}>温柔善解人意，说话轻声细语</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.methodCard} onPress={() => { const c = createDefaultMaleCharacter(); finishOnboarding(c); }}>
                            <Text style={styles.methodIcon}>👨</Text>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>阿泽（男）</Text>
                                <Text style={styles.methodDesc}>沉稳幽默，言简意赅</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep('choose-method')}>
                            <Text style={styles.outlineBtnText}>我想自己创建角色</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('welcome')}>
                            <Text style={styles.backBtnText}>返回</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Choose creation method */}
                {step === 'choose-method' && (
                    <View style={styles.centerContent}>
                        <Text style={styles.stepTitle}>选择创建方式</Text>
                        <TouchableOpacity style={styles.methodCard} onPress={() => { setCreationMethod('text'); setStep('text-input'); }}>
                            <Text style={styles.methodIcon}>📝</Text>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>文本描述</Text>
                                <Text style={styles.methodDesc}>粘贴一段角色描述，AI自动解析</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.methodCard} onPress={() => { setCreationMethod('qa'); setStep('step-by-step'); setQaIndex(0); setCurrentQuestion(INITIAL_QUESTIONS[0]); setAnswers([]); }}>
                            <Text style={styles.methodIcon}>💬</Text>
                            <View style={styles.methodInfo}>
                                <Text style={styles.methodName}>引导式问答</Text>
                                <Text style={styles.methodDesc}>AI一步步提问，你来回答</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('choose-gender')}>
                            <Text style={styles.backBtnText}>返回</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Text input */}
                {step === 'text-input' && (
                    <View style={styles.fullContent}>
                        <Text style={styles.stepTitle}>描述你的角色</Text>
                        <Text style={styles.stepDesc}>尽量详细地描述，AI会自动填充所有细节</Text>
                        <TextInput style={styles.textArea} multiline numberOfLines={8} value={textInput} onChangeText={setTextInput} placeholder="例如：她叫小雨，22岁，是个温柔的大学生，喜欢画画和听音乐，说话轻声细语，是我最好的朋友..." placeholderTextColor="#bbb" />
                        {loading ? (
                            <View style={styles.loadingBox}><ActivityIndicator size="large" color="#6C63FF" /><Text style={styles.loadingText}>正在解析...</Text></View>
                        ) : (
                            <View style={styles.row}>
                                <TouchableOpacity style={styles.backBtn} onPress={() => setStep('choose-method')}><Text style={styles.backBtnText}>返回</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleTextParse}><Text style={styles.primaryBtnText}>解析角色</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Step by step */}
                {step === 'step-by-step' && (
                    <View style={styles.fullContent}>
                        <Text style={styles.stepTitle}>创建角色</Text>
                        <View style={styles.progressRow}>
                            {INITIAL_QUESTIONS.map((_, i) => (
                                <View key={i} style={[styles.progressDot, i <= qaIndex && styles.progressDotActive, i < answers.length && styles.progressDotDone]} />
                            ))}
                        </View>

                        {answers.map((a, i) => (
                            <View key={i} style={styles.qaItem}>
                                <Text style={styles.qaQ}>{INITIAL_QUESTIONS[i]}</Text>
                                <Text style={styles.qaA}>{a}</Text>
                            </View>
                        ))}

                        <View style={styles.questionBubble}>
                            <Text style={styles.questionText}>{currentQuestion}</Text>
                        </View>

                        {loading ? (
                            <View style={styles.loadingBox}><ActivityIndicator size="large" color="#6C63FF" /><Text style={styles.loadingText}>正在生成角色...</Text></View>
                        ) : (
                            <View style={styles.answerRow}>
                                <TextInput style={styles.answerInput} value={answerInput} onChangeText={setAnswerInput} placeholder="输入你的回答..." placeholderTextColor="#bbb" onSubmitEditing={handleAnswer} />
                                <TouchableOpacity style={styles.sendBtn} onPress={handleAnswer}><Text style={styles.sendBtnText}>发送</Text></TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity style={styles.backBtn} onPress={() => { if (answers.length > 0) { const newAnswers = answers.slice(0, -1); const newIdx = Math.max(0, qaIndex - 1); setAnswers(newAnswers); setQaIndex(newIdx); setCurrentQuestion(newIdx < INITIAL_QUESTIONS.length ? INITIAL_QUESTIONS[newIdx] : currentQuestion); } else { setStep('choose-method'); } }}>
                            <Text style={styles.backBtnText}>{answers.length > 0 ? '上一步' : '返回'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Preview */}
                {step === 'preview' && persona && (
                    <View style={styles.fullContent}>
                        <Text style={styles.stepTitle}>角色预览</Text>
                        <ScrollView style={styles.previewCard}>
                            <PreviewSection title="身份">
                                <PreviewField label="名字" value={persona.partA.identity.name} />
                                <PreviewField label="年龄" value={persona.partA.identity.age} />
                                <PreviewField label="职业" value={persona.partA.identity.occupation} />
                                <PreviewField label="MBTI" value={persona.partB.identity.mbti} />
                                <PreviewField label="星座" value={persona.partB.identity.zodiac} />
                            </PreviewSection>
                            <PreviewSection title="说话风格">
                                <PreviewField label="口头禅" value={(persona.partB.speaking_style.catchphrases || []).join('、')} />
                                <PreviewField label="正式程度" value={persona.partB.speaking_style.formality} />
                                <PreviewField label="打字特征" value={persona.partB.speaking_style.typing_style} />
                            </PreviewSection>
                            <PreviewSection title="情感与人际">
                                <PreviewField label="情感表达" value={persona.partB.emotion_decision.emotion_expression} />
                                <PreviewField label="社交能量" value={persona.partB.interpersonal.social_energy} />
                                <PreviewField label="边界感" value={persona.partB.interpersonal.boundaries} />
                            </PreviewSection>
                            <PreviewSection title="与你的关系">
                                <PreviewField label="关系" value={persona.partC.relationship_to_user} />
                            </PreviewSection>
                        </ScrollView>
                        <View style={styles.previewActions}>
                            <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep(creationMethod === 'text' ? 'text-input' : 'step-by-step')}><Text style={styles.outlineBtnText}>重新创建</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => finishOnboarding(persona)}><Text style={styles.primaryBtnText}>确认使用</Text></TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
    return <View style={styles.previewSection}><Text style={styles.previewSectionTitle}>{title}</Text>{children}</View>;
}

function PreviewField({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return <View style={styles.previewField}><Text style={styles.previewLabel}>{label}</Text><Text style={styles.previewValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    content: { flexGrow: 1 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    fullContent: { flex: 1, padding: 20 },
    logo: { fontSize: 48, fontWeight: 'bold', color: '#6C63FF', marginBottom: 8 },
    subtitle: { fontSize: 18, color: '#666', marginBottom: 12 },
    desc: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 40, lineHeight: 20 },
    primaryBtn: { backgroundColor: '#6C63FF', borderRadius: 12, padding: 16, alignItems: 'center', minWidth: 200 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    skipBtn: { position: 'absolute', bottom: 40, right: 32, padding: 12 },
    skipBtnText: { color: '#999', fontSize: 14 },
    outlineBtn: { borderWidth: 1, borderColor: '#6C63FF', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
    outlineBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: 'bold' },
    backBtn: { padding: 12, alignItems: 'center' },
    backBtnText: { color: '#999', fontSize: 14 },
    stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    stepDesc: { fontSize: 14, color: '#666', marginBottom: 16 },
    methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee', width: '100%' },
    methodIcon: { fontSize: 32, marginRight: 16 },
    methodInfo: { flex: 1 },
    methodName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    methodDesc: { fontSize: 13, color: '#666', marginTop: 4 },
    textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 15, minHeight: 160, textAlignVertical: 'top', backgroundColor: '#fff', marginBottom: 16 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
    progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ddd' },
    progressDotActive: { backgroundColor: '#6C63FF' },
    progressDotDone: { backgroundColor: '#4CAF50' },
    qaItem: { marginBottom: 12 },
    qaQ: { fontSize: 13, color: '#999', marginBottom: 4 },
    qaA: { fontSize: 15, color: '#333', backgroundColor: '#fff', padding: 12, borderRadius: 12, overflow: 'hidden' },
    questionBubble: { backgroundColor: '#6C63FF', padding: 16, borderRadius: 16, borderBottomLeftRadius: 4, marginBottom: 16, alignSelf: 'flex-start', maxWidth: '85%' },
    questionText: { color: '#fff', fontSize: 15, lineHeight: 22 },
    answerRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
    answerInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, backgroundColor: '#fff' },
    sendBtn: { backgroundColor: '#6C63FF', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12 },
    sendBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    previewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, maxHeight: 400 },
    previewSection: { marginBottom: 16 },
    previewSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#6C63FF', marginBottom: 8 },
    previewField: { marginBottom: 6 },
    previewLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
    previewValue: { fontSize: 15, color: '#333' },
    previewActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    loadingBox: { alignItems: 'center', padding: 32 },
    loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
});
