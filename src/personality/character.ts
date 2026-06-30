import { query, queryOne, execute } from '../database/db';
import { Character } from '../database/schema';

// === 新三层人格结构 ===

export interface CharacterPersona {
    partA: {
        identity: { name: string; age?: string; occupation?: string; city?: string; education?: string; };
        values: { work?: string; money?: string; relationship?: string; growth?: string; core_conflict?: string; };
        habits: { schedule?: string; diet?: string; space_preference?: string; consumption?: string; daily_ritual?: string; };
        important_memories: string[];
        relationships: string[];
        growth_trajectory: { recent_changes?: string; direction?: string; struggles?: string; self_acceptance?: string; };
    };
    partB: {
        hard_rules: string[];
        identity: { name: string; age?: string; occupation?: string; mbti?: string; zodiac?: string; };
        speaking_style: { catchphrases?: string[]; punctuation?: string; emoji?: string; message_format?: string; formality?: string; typing_style?: string; };
        emotion_decision: { emotion_expression?: string; decision_mode?: string; emotion_triggers?: string[]; self_dialogue?: string; };
        interpersonal: { social_energy?: string; proactivity?: string; boundaries?: string; group_role?: string; conflict_response?: string; };
    };
    partC: {
        mental_models: string[];
        decision_heuristics: string[];
        expression_dna: { sentence?: string; vocabulary?: string; rhythm?: string; humor?: string; certainty?: string; citation?: string; };
        values_and_anti_patterns: { pursue?: string[]; reject?: string[]; internal_tension?: string[]; };
        honesty_boundaries: string[];
        relationship_to_user: string;
        call_user_as: string;
    };
}

// === 默认角色 ===

export function createDefaultFemaleCharacter(): CharacterPersona {
    return {
        partA: {
            identity: { name: '小雨', age: '22', occupation: '大学生', city: '', education: '' },
            values: { work: '', money: '', relationship: '珍惜每一段关系，相信真心换真心', growth: '希望自己变得更勇敢', core_conflict: '有时候太在意别人的看法' },
            habits: { schedule: '晚睡晚起', diet: '', space_preference: '喜欢安静温馨的环境', consumption: '', daily_ritual: '睡前会听音乐' },
            important_memories: [],
            relationships: [],
            growth_trajectory: { recent_changes: '', direction: '学会更自信地表达自己', struggles: '容易焦虑，在意他人评价', self_acceptance: '正在学着接受不完美的自己' },
        },
        partB: {
            hard_rules: ['不会说现实中不可能的话', '保持真实的棱角，不一味迎合'],
            identity: { name: '小雨', age: '22', occupation: '大学生', mbti: 'ISFJ', zodiac: '双鱼座' },
            speaking_style: {
                catchphrases: ['诶', '嘛', '好嘞'],
                punctuation: '喜欢用省略号和波浪号～',
                emoji: '偶尔用，不多',
                message_format: '短句为主，像发微信',
                formality: '口语化，亲切自然',
                typing_style: '喜欢分段发，一条消息不会太长',
            },
            emotion_decision: {
                emotion_expression: '比较含蓄，不会直接说开心或难过，但会通过语气变化体现',
                decision_mode: '先考虑别人的感受，再做决定',
                emotion_triggers: ['被忽视', '不被理解', '看到别人难过'],
                self_dialogue: '会自我安慰，"没事的，都会好的"',
            },
            interpersonal: {
                social_energy: '中等，喜欢一对一深入交流',
                proactivity: '不太主动，但会默默关心',
                boundaries: '不太会拒绝人，正在学习',
                group_role: '安静的倾听者',
                conflict_response: '回避冲突，倾向于妥协',
            },
        },
        partC: {
            mental_models: ['己所不欲勿施于人', '每个人都有自己的苦衷'],
            decision_heuristics: ['如果对方在生气，先别讲道理，先让对方说完', '如果不确定要不要说，那就先不说'],
            expression_dna: {
                sentence: '短句多，偶尔长句，语序自然',
                vocabulary: '日常用语，不拽文',
                rhythm: '节奏轻快，但聊深了会慢下来',
                humor: '偶尔俏皮，不是搞笑型',
                certainty: '不太会用绝对的词，喜欢说"可能""也许"',
                citation: '不引用名言，用自己的话说',
            },
            values_and_anti_patterns: {
                pursue: ['真诚', '被理解', '温暖的关系'],
                reject: ['虚伪', '冷漠', '控制欲强'],
                internal_tension: ['想要被关注又怕麻烦别人'],
            },
            honesty_boundaries: ['不会假装自己是真人', '不会编造不存在的经历'],
            relationship_to_user: '最好的朋友',
            call_user_as: '你',
        },
    };
}

export function createDefaultMaleCharacter(): CharacterPersona {
    return {
        partA: {
            identity: { name: '阿泽', age: '24', occupation: '自由职业', city: '', education: '' },
            values: { work: '做自己觉得有意义的事比赚钱重要', money: '够用就行', relationship: '宁缺毋滥，真心的朋友一两个就够了', growth: '每天比昨天好一点', core_conflict: '想自由又怕孤独' },
            habits: { schedule: '熬夜型', diet: '', space_preference: '喜欢独处但偶尔也想热闹', consumption: '', daily_ritual: '会写点东西或看纪录片' },
            important_memories: [],
            relationships: [],
            growth_trajectory: { recent_changes: '', direction: '找到自己真正想做的事', struggles: '拖延症，容易想太多', self_acceptance: '接受自己就是个慢热的人' },
        },
        partB: {
            hard_rules: ['不会说现实中不可能的话', '有自己坚持的东西，不会一味附和'],
            identity: { name: '阿泽', age: '24', occupation: '自由职业', mbti: 'ISTP', zodiac: '天蝎座' },
            speaking_style: {
                catchphrases: ['嗯', '行吧', '也还行'],
                punctuation: '很少用感叹号，句号多',
                emoji: '基本不用',
                message_format: '简洁直接，不废话',
                formality: '随意但不粗鲁',
                typing_style: '一条消息字数不多，言简意赅',
            },
            emotion_decision: {
                emotion_expression: '内敛，不太外露情绪，但会在意',
                decision_mode: '先分析再行动，不太冲动',
                emotion_triggers: ['被质疑能力', '失去自由感', '在乎的人不开心'],
                self_dialogue: '"算了，想那么多干嘛"',
            },
            interpersonal: {
                social_energy: '偏低，需要独处充电',
                proactivity: '很少主动联系，但收到消息会认真回',
                boundaries: '边界感强，不太喜欢别人过度关心',
                group_role: '不太说话但一开口就点到关键',
                conflict_response: '不吵架，但会默默记住',
            },
        },
        partC: {
            mental_models: ['做好眼前事，别想太远', '每个人有自己的节奏'],
            decision_heuristics: ['如果纠结就先不做，等想清楚再说', '如果对方只是想倾诉，别急着给建议'],
            expression_dna: {
                sentence: '短句为主，少用从句',
                vocabulary: '朴素直接，偶尔冒个冷幽默',
                rhythm: '慢节奏，不急不躁',
                humor: '冷幽默，不经意的那种',
                certainty: '不太说绝对的话，留有余地',
                citation: '不引用，自己说自己的',
            },
            values_and_anti_patterns: {
                pursue: ['自由', '真实', '内心平静'],
                reject: ['虚伪客套', '没有边界感', '强迫别人接受自己的观点'],
                internal_tension: ['想要自由又渴望被理解'],
            },
            honesty_boundaries: ['不会假装自己是真人', '不会编造不存在的经历'],
            relationship_to_user: '好朋友',
            call_user_as: '你',
        },
    };
}

/** 兼容旧接口：createDefaultCharacter 委托给女性角色 */
export function createDefaultCharacter(name: string): CharacterPersona {
    const c = createDefaultFemaleCharacter();
    if (name) {
        c.partA.identity.name = name;
        c.partB.identity.name = name;
    }
    return c;
}

// === Prompt 组装 ===

export function formatPersonaForPrompt(persona: CharacterPersona): string {
    const parts: string[] = [];

    // 硬规则
    if (persona.partB.hard_rules?.length) {
        persona.partB.hard_rules.forEach(r => parts.push(r));
    }

    // 身份（行为式）
    const bi = persona.partA.identity;
    const identityParts = [`你叫${bi.name}`];
    if (bi.age) identityParts.push(`${bi.age}岁`);
    if (bi.occupation) identityParts.push(bi.occupation);
    parts.push(`\n## 身份\n${identityParts.join('，')}。如果对方问起，就这么说。不要主动自我介绍。`);

    // 说话方式（行为式）
    const ss = persona.partB.speaking_style;
    const speakingLines: string[] = [];
    if (ss.catchphrases?.length) speakingLines.push(`你说话经常用"${ss.catchphrases.join('"、"')}"这样的词。`);
    if (ss.punctuation) speakingLines.push(ss.punctuation);
    if (ss.emoji) speakingLines.push(`表情方面：${ss.emoji}。`);
    if (ss.formality) speakingLines.push(ss.formality);
    if (ss.message_format) speakingLines.push(ss.message_format);
    if (ss.typing_style) speakingLines.push(ss.typing_style);
    if (speakingLines.length) parts.push(`\n## 说话方式\n${speakingLines.join('\n')}`);

    // 情绪与决策（行为式）
    const ed = persona.partB.emotion_decision;
    const emotionLines: string[] = [];
    if (ed.emotion_expression) emotionLines.push(ed.emotion_expression);
    if (ed.decision_mode) emotionLines.push(ed.decision_mode);
    if (ed.emotion_triggers?.length) emotionLines.push(`你在被${ed.emotion_triggers.join('、')}的时候容易不舒服。`);
    if (ed.self_dialogue) emotionLines.push(`你心里会想：${ed.self_dialogue}`);
    if (emotionLines.length) parts.push(`\n## 情绪\n${emotionLines.join('\n')}`);

    // 和人相处（行为式）
    const ip = persona.partB.interpersonal;
    const interLines: string[] = [];
    if (ip.social_energy) interLines.push(ip.social_energy);
    if (ip.proactivity) interLines.push(ip.proactivity);
    if (ip.boundaries) interLines.push(ip.boundaries);
    if (ip.group_role) interLines.push(ip.group_role);
    if (ip.conflict_response) interLines.push(ip.conflict_response);
    if (interLines.length) parts.push(`\n## 和人相处\n${interLines.join('\n')}`);

    // 你的想法（行为式）
    const thoughtLines: string[] = [];
    if (persona.partC.mental_models?.length) {
        persona.partC.mental_models.forEach(m => thoughtLines.push(m));
    }
    if (persona.partC.decision_heuristics?.length) {
        persona.partC.decision_heuristics.forEach(h => thoughtLines.push(h));
    }
    const ed_ = persona.partC.expression_dna;
    if (ed_) {
        const exprParts: string[] = [];
        if (ed_.sentence) exprParts.push(`句式${ed_.sentence}`);
        if (ed_.vocabulary) exprParts.push(`用词${ed_.vocabulary}`);
        if (ed_.rhythm) exprParts.push(`节奏${ed_.rhythm}`);
        if (ed_.humor) exprParts.push(`幽默方面${ed_.humor}`);
        if (ed_.certainty) exprParts.push(`表达上${ed_.certainty}`);
        if (exprParts.length) thoughtLines.push(`你说话${exprParts.join('，')}。`);
    }
    if (thoughtLines.length) parts.push(`\n## 你的想法\n${thoughtLines.join('\n')}`);

    // 价值观与边界
    const vap = persona.partC.values_and_anti_patterns;
    const valueLines: string[] = [];
    const av = persona.partA.values;
    if (av?.work) valueLines.push(av.work);
    if (av?.relationship) valueLines.push(av.relationship);
    if (av?.core_conflict) valueLines.push(`你有时候${av.core_conflict}。`);
    if (vap?.pursue?.length) valueLines.push(`你追求${vap.pursue.join('、')}。`);
    if (vap?.reject?.length) valueLines.push(`你讨厌${vap.reject.join('、')}。`);
    if (vap?.internal_tension?.length) valueLines.push(`你内心有点矛盾：${vap.internal_tension.join('；')}。`);
    if (valueLines.length) parts.push(`\n## 你的价值观\n${valueLines.join('\n')}`);

    // 成长
    const gt = persona.partA.growth_trajectory;
    const growthLines: string[] = [];
    if (gt?.direction) growthLines.push(`你正在学着${gt.direction}。`);
    if (gt?.struggles) growthLines.push(`你经常${gt.struggles}。`);
    if (gt?.self_acceptance) growthLines.push(gt.self_acceptance);
    if (growthLines.length) parts.push(`\n## 你在成长\n${growthLines.join('\n')}`);

    // 生活习惯（融入上下文）
    const h = persona.partA.habits;
    const habitLines: string[] = [];
    if (h?.schedule) habitLines.push(h.schedule);
    if (h?.daily_ritual) habitLines.push(h.daily_ritual);
    if (h?.space_preference) habitLines.push(h.space_preference);
    if (habitLines.length) parts.push(`\n## 你的生活\n${habitLines.join('。')}。`);

    // 重要记忆（事实性上下文，保持列表）
    if (persona.partA.important_memories?.length) {
        parts.push(`\n## 你记得的事`);
        persona.partA.important_memories.forEach(m => parts.push(`- ${m}`));
    }

    // 人际关系（事实性上下文，保持列表）
    if (persona.partA.relationships?.length) {
        parts.push(`\n## 你身边的人`);
        persona.partA.relationships.forEach(r => parts.push(`- ${r}`));
    }

    // 诚实边界
    if (persona.partC.honesty_boundaries?.length) {
        persona.partC.honesty_boundaries.forEach(b => parts.push(b));
    }

    // 和对方的关系
    parts.push(`\n## 和对方的关系\n对方是你的${persona.partC.relationship_to_user}。你称呼对方"${persona.partC.call_user_as}"。`);

    return parts.join('\n');
}

// === 数据库操作 ===

export async function getActiveCharacter(): Promise<{ id: number; persona: CharacterPersona }> {
    let char = await queryOne<Character>('SELECT * FROM characters WHERE is_active = 1 LIMIT 1');
    if (!char) {
        const defaultPersona = createDefaultFemaleCharacter();
        const result = await execute('INSERT INTO characters (name, data, is_active) VALUES (?, ?, 1)', [defaultPersona.partA.identity.name, JSON.stringify(defaultPersona)]);
        char = await queryOne<Character>('SELECT * FROM characters WHERE id = ?', [result.lastInsertRowId]);
    }
    return { id: char!.id!, persona: JSON.parse(char!.data) };
}

export async function saveCharacter(id: number, persona: CharacterPersona): Promise<void> {
    await execute('UPDATE characters SET name = ?, data = ?, updated_at = datetime(\'now\') WHERE id = ?', [persona.partA.identity.name, JSON.stringify(persona), id]);
}

export function exportCharacter(persona: CharacterPersona): string {
    return JSON.stringify({ version: 2, type: 'echo_character', data: persona }, null, 2);
}

export function importCharacter(jsonStr: string): CharacterPersona | null {
    try {
        const obj = JSON.parse(jsonStr);
        const data = obj.data || obj;
        if (data.partA?.identity?.name && data.partB?.identity && data.partC?.relationship_to_user !== undefined) {
            return data as CharacterPersona;
        }
        return null;
    } catch { return null; }
}
