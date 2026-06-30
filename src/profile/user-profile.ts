import { execute, query, queryOne } from '../database/db';
import { UserProfile, Message } from '../database/schema';
import { llmClient, ChatMessage } from '../api/llm-client';
import { CharacterPersona } from '../personality/character';

// === 用户画像三层结构（与 CharacterPersona 对称） ===

export interface UserPersona {
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

function createEmptyProfile(): UserPersona {
    return {
        partA: {
            identity: { name: '' },
            values: {},
            habits: {},
            important_memories: [],
            relationships: [],
            growth_trajectory: {},
        },
        partB: {
            hard_rules: [],
            identity: { name: '' },
            speaking_style: {},
            emotion_decision: {},
            interpersonal: {},
        },
        partC: {
            mental_models: [],
            decision_heuristics: [],
            expression_dna: {},
            values_and_anti_patterns: {},
            honesty_boundaries: [],
            relationship_to_user: '',
            call_user_as: '',
        },
    };
}

// === LLM 提取 Prompt ===

const PROFILE_EXTRACTION_PROMPT = `你是一个用户画像分析专家。分析以下对话，从中提取关于用户本人的信息，更新用户画像。

## 提取原则
1. 只从用户的消息中提取信息，AI的回复仅供上下文参考
2. 只提取有明确证据的信息，不要推测
3. 每个字段用自然语言的行为描述，不要用短标签
4. 新信息与已有信息冲突时以新的为准
5. 没有新信息的字段留空

## 输出格式（JSON）
{
  "partA": {
    "identity": { "name": "名字", "age": "年龄", "occupation": "职业", "city": "城市", "education": "教育背景" },
    "values": { "work": "工作观", "money": "金钱观", "relationship": "关系观", "growth": "成长观", "core_conflict": "核心矛盾" },
    "habits": { "schedule": "作息", "diet": "饮食", "space_preference": "空间偏好", "consumption": "消费习惯", "daily_ritual": "日常仪式" },
    "important_memories": ["对用户有重要影响的记忆"],
    "relationships": ["用户身边的重要人物"],
    "growth_trajectory": { "recent_changes": "近年变化", "direction": "努力方向", "struggles": "反复挣扎的课题", "self_acceptance": "自我接纳" }
  },
  "partB": {
    "hard_rules": ["用户绝对不会做的事"],
    "identity": { "name": "名字", "age": "年龄", "occupation": "职业", "mbti": "MBTI类型", "zodiac": "星座" },
    "speaking_style": { "catchphrases": ["口头禅"], "punctuation": "标点习惯", "emoji": "表情习惯", "message_format": "消息格式习惯", "formality": "正式程度", "typing_style": "打字特征" },
    "emotion_decision": { "emotion_expression": "情感表达方式", "decision_mode": "决策方式", "emotion_triggers": ["情绪触发点"], "self_dialogue": "自我对话" },
    "interpersonal": { "social_energy": "社交状态", "proactivity": "主动程度", "boundaries": "边界感", "group_role": "群体角色", "conflict_response": "冲突应对" }
  },
  "partC": {
    "mental_models": ["信奉的道理"],
    "decision_heuristics": ["如果X就Y的决策习惯"],
    "expression_dna": { "sentence": "句式特点", "vocabulary": "用词特点", "rhythm": "节奏", "humor": "幽默风格", "certainty": "确定性表达", "citation": "引用习惯" },
    "values_and_anti_patterns": { "pursue": ["追求的"], "reject": ["讨厌的"], "internal_tension": ["内心矛盾"] },
    "honesty_boundaries": ["边界"],
    "relationship_to_user": "与AI角色的关系",
    "call_user_as": "AI角色称呼用户的方式"
  }
}

规则：
1. 每个字段写成完整的行为描述句子，不要短标签
2. 只返回有明确证据的字段，不确定的留空字符串或空数组
3. 只返回JSON，不要其他文字
4. 没有信息的字段输出空字符串""或空数组[]，不要编造，不要输出"暂无"、"未知"等占位文字
5. 画像是逐步积累的，本次没有新信息的字段保持空即可，不需要强行填写`;

// === Manager ===

class UserProfileManager {

    // --- CRUD ---

    async getOrCreate(characterId: number): Promise<UserPersona> {
        const row = await queryOne<UserProfile>('SELECT * FROM user_profiles WHERE character_id = ?', [characterId]);
        if (row) {
            try {
                const parsed = JSON.parse(row.data);
                // 兼容旧格式
                if (parsed.partA) return parsed as UserPersona;
            } catch { /* corrupted */ }
        }
        const empty = createEmptyProfile();
        await execute('INSERT INTO user_profiles (character_id, data, updated_at) VALUES (?, ?, datetime(\'now\'))', [characterId, JSON.stringify(empty)]);
        return empty;
    }

    async updateProfile(characterId: number, updates: Partial<UserPersona>, reason: string): Promise<void> {
        const current = await this.getOrCreate(characterId);
        deepMerge(current, updates);
        await execute('UPDATE user_profiles SET data = ?, updated_at = datetime(\'now\') WHERE character_id = ?', [JSON.stringify(current), characterId]);
    }

    async getProfileSummary(characterId: number): Promise<string | null> {
        const profile = await this.getOrCreate(characterId);
        const parts: string[] = [];

        // Part A 摘要
        const id_ = profile.partA.identity;
        if (id_.name || id_.age || id_.occupation) {
            const idParts = [id_.name, id_.age ? `${id_.age}岁` : '', id_.occupation].filter(Boolean);
            parts.push(`用户${idParts.join('，')}`);
        }
        if (profile.partA.values?.work) parts.push(profile.partA.values.work);
        if (profile.partA.values?.relationship) parts.push(profile.partA.values.relationship);
        if (profile.partA.growth_trajectory?.struggles) parts.push(profile.partA.growth_trajectory.struggles);
        if (profile.partA.important_memories?.length) parts.push(`重要经历：${profile.partA.important_memories.slice(0, 3).join('；')}`);

        // Part B 摘要
        if (profile.partB.emotion_decision?.emotion_expression) parts.push(profile.partB.emotion_decision.emotion_expression);
        if (profile.partB.interpersonal?.social_energy) parts.push(profile.partB.interpersonal.social_energy);

        // Part C 摘要
        if (profile.partC.values_and_anti_patterns?.pursue?.length) parts.push(`追求${profile.partC.values_and_anti_patterns.pursue.join('、')}`);

        return parts.length > 0 ? parts.join('\n') : null;
    }

    // --- LLM 自动提取 ---

    async extractFromConversation(messages: Message[], characterId: number): Promise<void> {
        if (!llmClient.isConfigured()) {
            console.log('[UserProfile] Skip: LLM not configured');
            return;
        }
        if (messages.length === 0) {
            console.log('[UserProfile] Skip: no messages');
            return;
        }

        console.log(`[UserProfile] Extracting from ${messages.length} messages for characterId=${characterId}`);
        const currentProfile = await this.getOrCreate(characterId);

        const conversationText = messages.map(m =>
            `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`
        ).join('\n');

        const chatMessages: ChatMessage[] = [
            { role: 'system', content: PROFILE_EXTRACTION_PROMPT },
            { role: 'user', content: `【当前用户画像】\n${JSON.stringify(currentProfile, null, 2)}\n\n【最近对话】\n${conversationText}` },
        ];

        try {
            console.log('[UserProfile] Calling LLM...');
            const completion = await llmClient.chat(chatMessages, { temperature: 0.3, max_tokens: 8000 });
            const raw = completion.choices[0].message.content;
            console.log('[UserProfile] LLM response length:', raw.length);

            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.log('[UserProfile] No JSON found in response. Raw:', raw.substring(0, 200));
                return;
            }

            const extracted = JSON.parse(jsonMatch[0]) as Partial<UserPersona>;
            console.log('[UserProfile] Parsed keys:', Object.keys(extracted));
            console.log('[UserProfile] Identity:', JSON.stringify(extracted.partA?.identity));
            console.log('[UserProfile] Calling updateProfile...');
            await this.updateProfile(characterId, extracted, 'auto_extract');
            console.log('[UserProfile] Auto-updated successfully');
        } catch (error: any) {
            console.error('[UserProfile] Extract failed:', error.message || error);
            if (error.response?.data) console.error('[UserProfile] API error:', JSON.stringify(error.response.data));
        }
    }

    // --- 导入导出 ---

    exportProfile(profile: UserPersona): string {
        return JSON.stringify({ version: 1, type: 'echo_user_profile', data: profile }, null, 2);
    }

    importProfile(jsonStr: string): UserPersona | null {
        try {
            const obj = JSON.parse(jsonStr);
            const data = obj.data || obj;
            if (data.partA?.identity !== undefined) return data as UserPersona;
            return null;
        } catch { return null; }
    }

    /** 将用户画像导出为可导入的角色 JSON */
    exportAsCharacter(profile: UserPersona): string {
        const character: CharacterPersona = {
            partA: JSON.parse(JSON.stringify(profile.partA)),
            partB: JSON.parse(JSON.stringify(profile.partB)),
            partC: {
                ...JSON.parse(JSON.stringify(profile.partC)),
                relationship_to_user: profile.partC.relationship_to_user || '用户本人',
                call_user_as: profile.partC.call_user_as || '你',
            },
        };
        return JSON.stringify({ version: 2, type: 'echo_character', data: character }, null, 2);
    }
}

// --- 深度合并 ---

function deepMerge(target: any, source: any): void {
    if (!source || typeof source !== 'object') return;
    for (const key of Object.keys(source)) {
        if (key === 'updateHistory') continue;
        const sv = source[key];
        if (sv === undefined || sv === null || sv === '') continue;
        if (Array.isArray(sv)) {
            if (sv.length > 0) target[key] = sv;
        } else if (typeof sv === 'object') {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            deepMerge(target[key], sv);
        } else {
            target[key] = sv;
        }
    }
}

export const userProfileManager = new UserProfileManager();
