import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CharacterPersona } from '../personality/character';

interface Props {
    persona: CharacterPersona;
    onSave: (p: CharacterPersona) => void;
    onCancel: () => void;
    title?: string;
}

export default function CharacterEditor({ persona, onSave, onCancel, title = '编辑角色' }: Props) {
    const [p, setP] = useState<CharacterPersona>(JSON.parse(JSON.stringify(persona)));
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'identity': true });

    const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

    const updateA = (sub: string, field: string, value: string) =>
        setP(prev => ({ ...prev, partA: { ...prev.partA, [sub]: typeof prev.partA[sub as keyof typeof prev.partA] === 'object' && !Array.isArray(prev.partA[sub as keyof typeof prev.partA]) ? { ...(prev.partA[sub as keyof typeof prev.partA] as any), [field]: value } : value } }));
    const updateB = (sub: string, field: string, value: any) =>
        setP(prev => ({ ...prev, partB: { ...prev.partB, [sub]: typeof prev.partB[sub as keyof typeof prev.partB] === 'object' && !Array.isArray(prev.partB[sub as keyof typeof prev.partB]) ? { ...(prev.partB[sub as keyof typeof prev.partB] as any), [field]: value } : value } }));
    const updateC = (sub: string, field: string, value: any) =>
        setP(prev => ({ ...prev, partC: { ...prev.partC, [sub]: typeof prev.partC[sub as keyof typeof prev.partC] === 'object' && !Array.isArray(prev.partC[sub as keyof typeof prev.partC]) ? { ...(prev.partC[sub as keyof typeof prev.partC] as any), [field]: value } : value } }));
    const setArray = (path: 'partA' | 'partB' | 'partC', key: string, value: string[]) =>
        setP(prev => ({ ...prev, [path]: { ...prev[path], [key]: value } }));

    const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
        <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(id)}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.arrow}>{expanded[id] ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {expanded[id] && children}
        </View>
    );

    const Field = ({ label, value, onChangeText, multiline, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; multiline?: boolean; placeholder?: string }) => (
        <>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={[styles.input, multiline && styles.multiline]} value={value} onChangeText={onChangeText} multiline={multiline} placeholder={placeholder} placeholderTextColor="#bbb" />
        </>
    );

    const ArrayField = ({ label, value, onChangeText, placeholder }: { label: string; value: string[]; onChangeText: (v: string[]) => void; placeholder?: string }) => (
        <>
            <Text style={styles.label}>{label}（每行一条）</Text>
            <TextInput style={[styles.input, styles.multiline]} value={value.join('\n')} onChangeText={v => onChangeText(v.split('\n').map(s => s.trim()).filter(Boolean))} multiline placeholder={placeholder} placeholderTextColor="#bbb" />
        </>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.editorHeader}>
                <TouchableOpacity onPress={onCancel}><Text style={styles.cancelText}>取消</Text></TouchableOpacity>
                <Text style={styles.editorTitle}>{title}</Text>
                <TouchableOpacity onPress={() => onSave(p)}><Text style={styles.saveText}>保存</Text></TouchableOpacity>
            </View>

            {/* Part A: 身份信息 */}
            <Section id="identity" title="身份信息">
                <Field label="名字" value={p.partA.identity.name} onChangeText={v => updateA('identity', 'name', v)} />
                <Field label="年龄" value={p.partA.identity.age || ''} onChangeText={v => updateA('identity', 'age', v)} placeholder="如：22" />
                <Field label="职业" value={p.partA.identity.occupation || ''} onChangeText={v => updateA('identity', 'occupation', v)} />
                <Field label="城市" value={p.partA.identity.city || ''} onChangeText={v => updateA('identity', 'city', v)} />
                <Field label="教育背景" value={p.partA.identity.education || ''} onChangeText={v => updateA('identity', 'education', v)} />
            </Section>

            <Section id="values" title="价值观">
                <Field label="工作观" value={p.partA.values.work || ''} onChangeText={v => updateA('values', 'work', v)} />
                <Field label="金钱观" value={p.partA.values.money || ''} onChangeText={v => updateA('values', 'money', v)} />
                <Field label="关系观" value={p.partA.values.relationship || ''} onChangeText={v => updateA('values', 'relationship', v)} />
                <Field label="成长观" value={p.partA.values.growth || ''} onChangeText={v => updateA('values', 'growth', v)} />
                <Field label="核心矛盾" value={p.partA.values.core_conflict || ''} onChangeText={v => updateA('values', 'core_conflict', v)} multiline />
            </Section>

            <Section id="habits" title="生活习惯">
                <Field label="作息" value={p.partA.habits.schedule || ''} onChangeText={v => updateA('habits', 'schedule', v)} />
                <Field label="饮食" value={p.partA.habits.diet || ''} onChangeText={v => updateA('habits', 'diet', v)} />
                <Field label="空间偏好" value={p.partA.habits.space_preference || ''} onChangeText={v => updateA('habits', 'space_preference', v)} />
                <Field label="消费观" value={p.partA.habits.consumption || ''} onChangeText={v => updateA('habits', 'consumption', v)} />
                <Field label="日常仪式" value={p.partA.habits.daily_ritual || ''} onChangeText={v => updateA('habits', 'daily_ritual', v)} multiline />
            </Section>

            <Section id="memories" title="重要记忆">
                <ArrayField label="重要记忆" value={p.partA.important_memories} onChangeText={v => setArray('partA', 'important_memories', v)} placeholder="每行一条记忆" />
            </Section>

            <Section id="relationships_a" title="人际关系">
                <ArrayField label="人际关系" value={p.partA.relationships} onChangeText={v => setArray('partA', 'relationships', v)} placeholder="每行一条关系" />
            </Section>

            <Section id="growth" title="成长轨迹">
                <Field label="近年变化" value={p.partA.growth_trajectory.recent_changes || ''} onChangeText={v => updateA('growth_trajectory', 'recent_changes', v)} multiline />
                <Field label="努力方向" value={p.partA.growth_trajectory.direction || ''} onChangeText={v => updateA('growth_trajectory', 'direction', v)} multiline />
                <Field label="反复挣扎" value={p.partA.growth_trajectory.struggles || ''} onChangeText={v => updateA('growth_trajectory', 'struggles', v)} multiline />
                <Field label="自我接纳" value={p.partA.growth_trajectory.self_acceptance || ''} onChangeText={v => updateA('growth_trajectory', 'self_acceptance', v)} multiline />
            </Section>

            {/* Part B: 硬规则 */}
            <Section id="hard_rules" title="硬规则">
                <ArrayField label="不可违背的底线" value={p.partB.hard_rules} onChangeText={v => setArray('partB', 'hard_rules', v)} placeholder="每行一条规则" />
            </Section>

            {/* Part B: 身份锚定 */}
            <Section id="b_identity" title="身份 (MBTI/星座)">
                <Field label="MBTI" value={p.partB.identity.mbti || ''} onChangeText={v => updateB('identity', 'mbti', v)} placeholder="如：ISFJ" />
                <Field label="星座" value={p.partB.identity.zodiac || ''} onChangeText={v => updateB('identity', 'zodiac', v)} placeholder="如：双鱼座" />
            </Section>

            {/* Part B: 说话风格 */}
            <Section id="speaking" title="说话风格">
                <ArrayField label="口头禅" value={p.partB.speaking_style.catchphrases || []} onChangeText={v => setP(prev => ({ ...prev, partB: { ...prev.partB, speaking_style: { ...prev.partB.speaking_style, catchphrases: v } } }))} />
                <Field label="标点习惯" value={p.partB.speaking_style.punctuation || ''} onChangeText={v => updateB('speaking_style', 'punctuation', v)} />
                <Field label="表情使用" value={p.partB.speaking_style.emoji || ''} onChangeText={v => updateB('speaking_style', 'emoji', v)} />
                <Field label="消息格式" value={p.partB.speaking_style.message_format || ''} onChangeText={v => updateB('speaking_style', 'message_format', v)} />
                <Field label="正式程度" value={p.partB.speaking_style.formality || ''} onChangeText={v => updateB('speaking_style', 'formality', v)} />
                <Field label="打字特征" value={p.partB.speaking_style.typing_style || ''} onChangeText={v => updateB('speaking_style', 'typing_style', v)} />
            </Section>

            {/* Part B: 情感决策 */}
            <Section id="emotion" title="情感与决策">
                <Field label="情感表达" value={p.partB.emotion_decision.emotion_expression || ''} onChangeText={v => updateB('emotion_decision', 'emotion_expression', v)} multiline />
                <Field label="决策模式" value={p.partB.emotion_decision.decision_mode || ''} onChangeText={v => updateB('emotion_decision', 'decision_mode', v)} multiline />
                <ArrayField label="情绪触发" value={p.partB.emotion_decision.emotion_triggers || []} onChangeText={v => setP(prev => ({ ...prev, partB: { ...prev.partB, emotion_decision: { ...prev.partB.emotion_decision, emotion_triggers: v } } }))} />
                <Field label="内心独白" value={p.partB.emotion_decision.self_dialogue || ''} onChangeText={v => updateB('emotion_decision', 'self_dialogue', v)} multiline />
            </Section>

            {/* Part B: 人际行为 */}
            <Section id="interpersonal" title="人际行为">
                <Field label="社交能量" value={p.partB.interpersonal.social_energy || ''} onChangeText={v => updateB('interpersonal', 'social_energy', v)} />
                <Field label="主动性" value={p.partB.interpersonal.proactivity || ''} onChangeText={v => updateB('interpersonal', 'proactivity', v)} />
                <Field label="边界感" value={p.partB.interpersonal.boundaries || ''} onChangeText={v => updateB('interpersonal', 'boundaries', v)} multiline />
                <Field label="群体角色" value={p.partB.interpersonal.group_role || ''} onChangeText={v => updateB('interpersonal', 'group_role', v)} />
                <Field label="冲突应对" value={p.partB.interpersonal.conflict_response || ''} onChangeText={v => updateB('interpersonal', 'conflict_response', v)} multiline />
            </Section>

            {/* Part C: 心智模型 */}
            <Section id="mental" title="心智模型">
                <ArrayField label="心智模型" value={p.partC.mental_models} onChangeText={v => setArray('partC', 'mental_models', v)} placeholder="每行一条" />
            </Section>

            {/* Part C: 决策启发 */}
            <Section id="heuristics" title="决策启发">
                <ArrayField label="决策启发" value={p.partC.decision_heuristics} onChangeText={v => setArray('partC', 'decision_heuristics', v)} placeholder="如果X则Y" />
            </Section>

            {/* Part C: 表达DNA */}
            <Section id="dna" title="表达DNA">
                <Field label="句式" value={p.partC.expression_dna.sentence || ''} onChangeText={v => updateC('expression_dna', 'sentence', v)} />
                <Field label="词汇" value={p.partC.expression_dna.vocabulary || ''} onChangeText={v => updateC('expression_dna', 'vocabulary', v)} />
                <Field label="节奏" value={p.partC.expression_dna.rhythm || ''} onChangeText={v => updateC('expression_dna', 'rhythm', v)} />
                <Field label="幽默" value={p.partC.expression_dna.humor || ''} onChangeText={v => updateC('expression_dna', 'humor', v)} />
                <Field label="确定性" value={p.partC.expression_dna.certainty || ''} onChangeText={v => updateC('expression_dna', 'certainty', v)} />
                <Field label="引用习惯" value={p.partC.expression_dna.citation || ''} onChangeText={v => updateC('expression_dna', 'citation', v)} />
            </Section>

            {/* Part C: 价值边界 */}
            <Section id="vap" title="价值边界">
                <ArrayField label="追求" value={p.partC.values_and_anti_patterns.pursue || []} onChangeText={v => setP(prev => ({ ...prev, partC: { ...prev.partC, values_and_anti_patterns: { ...prev.partC.values_and_anti_patterns, pursue: v } } }))} />
                <ArrayField label="拒绝" value={p.partC.values_and_anti_patterns.reject || []} onChangeText={v => setP(prev => ({ ...prev, partC: { ...prev.partC, values_and_anti_patterns: { ...prev.partC.values_and_anti_patterns, reject: v } } }))} />
                <ArrayField label="内在矛盾" value={p.partC.values_and_anti_patterns.internal_tension || []} onChangeText={v => setP(prev => ({ ...prev, partC: { ...prev.partC, values_and_anti_patterns: { ...prev.partC.values_and_anti_patterns, internal_tension: v } } }))} />
            </Section>

            {/* Part C: 诚实边界 */}
            <Section id="honesty" title="诚实边界">
                <ArrayField label="诚实边界" value={p.partC.honesty_boundaries} onChangeText={v => setArray('partC', 'honesty_boundaries', v)} placeholder="不能做的事或不能说的话" />
            </Section>

            {/* Part C: 用户关系 */}
            <Section id="user_rel" title="与用户的关系">
                <Field label="关系定位" value={p.partC.relationship_to_user} onChangeText={v => setP(prev => ({ ...prev, partC: { ...prev.partC, relationship_to_user: v } }))} placeholder="如：最好的朋友" />
                <Field label="称呼用户" value={p.partC.call_user_as} onChangeText={v => setP(prev => ({ ...prev, partC: { ...prev.partC, call_user_as: v } }))} placeholder="如：你" />
            </Section>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    section: { backgroundColor: '#fff', marginTop: 8, borderRadius: 8, marginHorizontal: 12, overflow: 'hidden' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    arrow: { fontSize: 12, color: '#999' },
    editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    editorTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    cancelText: { fontSize: 16, color: '#999' },
    saveText: { fontSize: 16, color: '#6C63FF', fontWeight: 'bold' },
    label: { fontSize: 13, color: '#666', marginTop: 10, marginBottom: 4, paddingHorizontal: 14 },
    input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, fontSize: 15, backgroundColor: '#fafafa', marginHorizontal: 14, marginBottom: 8 },
    multiline: { minHeight: 60, textAlignVertical: 'top' },
});
