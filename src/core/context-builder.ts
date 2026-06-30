import { ChatMessage } from '../api/llm-client';
import { CORE_SYSTEM_PROMPT } from './core-system';
import { WorkingMemory } from './session-manager';
import { MemoryNode, Relationship, CharacterMood } from '../database/schema';
import { memorySystem } from '../memory/memory-system';
import { relationshipEngine } from '../relationship/relationship-engine';
import { characterMoodEngine } from '../mood/character-mood';

export interface ContextInput {
    characterName: string;
    characterPersona: string;
    workingMemory: WorkingMemory;
    relevantMemories: MemoryNode[];
    userProfileSummary: string | null;
    relationship: Relationship | null;
    mood: CharacterMood | null;
    currentMessage: string;
}

export class ContextBuilder {
    buildMessages(input: ContextInput): ChatMessage[] {
        const messages: ChatMessage[] = [];

        // 1. CORE 系统提示 + 角色人格
        messages.push({ role: 'system', content: `${CORE_SYSTEM_PROMPT}\n\n## 角色人格\n你是${input.characterName}。\n\n${input.characterPersona}` });

        // 1.5 当前时间
        const now = new Date();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekDays[now.getDay()]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        messages.push({ role: 'system', content: `[当前时间]\n${timeStr}` });

        // 2. 关系状态 + 行为指令
        if (input.relationship) {
            const levelName = relationshipEngine.getLevelName(input.relationship.level);
            const behavior = relationshipEngine.getLevelBehavior(input.relationship.level);
            const parts = [
                `[关系状态]`,
                `等级：${levelName}（${input.relationship.level}/4）`,
                `亲密度：${(input.relationship.intimacy * 100).toFixed(0)}%`,
                `信任度：${(input.relationship.trust * 100).toFixed(0)}%`,
                `行为指导：${behavior}`,
            ];
            messages.push({ role: 'system', content: parts.join('\n') });
        }

        // 3. 角色即时情绪
        if (input.mood) {
            const moodName = characterMoodEngine.getMoodName(input.mood.mood);
            const parts = [
                `[角色当前状态]`,
                `情绪：${moodName}（强度：${(input.mood.intensity * 100).toFixed(0)}%）`,
            ];
            if (input.mood.trigger) parts.push(`原因：${input.mood.trigger}`);
            // 根据情绪添加说话方式指导
            const styleMap: Record<string, string> = {
                happy: '你现在心情不错，说话会轻快一些，可能会多用"哈哈"、语气词。',
                gentle: '你现在很温柔，会多听对方说，回应简短但温暖，比如"嗯嗯"、"我在听"。',
                calm: '你现在很平静，不会被对方的情绪带动，回应稳定、不急不躁。',
                concerned: '你现在有点担心对方，会主动问"你还好吗"，语气会轻一些。',
                excited: '你现在有点兴奋，说话会快一些，可能会连发好几条消息。',
            };
            if (styleMap[input.mood.mood]) parts.push(`说话方式：${styleMap[input.mood.mood]}`);
            parts.push(`（还有${input.mood.affected_turns}轮影响）`);
            messages.push({ role: 'system', content: parts.join('\n') });
        }

        // 4. 会话摘要（滚动队列，最新在前）
        if (input.workingMemory.summaries.length > 0) {
            const summaryText = input.workingMemory.summaries
                .map((s, i) => `${i + 1}. ${s.summary}`)
                .join('\n');
            messages.push({ role: 'system', content: `[近期对话摘要]\n${summaryText}` });
        }

        // 5. 相关记忆
        if (input.relevantMemories.length > 0) {
            const memoryLines = input.relevantMemories.map((m, i) => {
                const factualTags = m.tags.factual?.length > 0 ? ` [${m.tags.factual.join(', ')}]` : '';
                const natureTags = m.tags.nature?.length > 0 ? ` {${m.tags.nature.join(', ')}}` : '';
                return `${i + 1}. ${m.content}${factualTags}${natureTags}`;
            });
            messages.push({ role: 'system', content: `[相关记忆]\n${memoryLines.join('\n')}` });

            // 只有真正注入 LLM 上下文的记忆才标记访问
            for (const m of input.relevantMemories) {
                memorySystem.touchMemory(m.id).catch(console.error);
            }
        }

        // 6. 用户画像
        if (input.userProfileSummary) messages.push({ role: 'system', content: `[用户画像]\n${input.userProfileSummary}` });

        // 7. 对话间隔
        const lastMsg = input.workingMemory.recentMessages[input.workingMemory.recentMessages.length - 1];
        if (lastMsg?.sent_at) {
            const gap = Date.now() - new Date(lastMsg.sent_at).getTime();
            const minutes = Math.floor(gap / 60000);
            if (minutes >= 60) {
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                const gapText = days > 0 ? `${days}天` : hours > 24 ? `${Math.floor(hours / 24)}天${hours % 24}小时` : `${hours}小时`;
                messages.push({ role: 'system', content: `[距离上次对话已过 ${gapText}]` });
            } else if (minutes >= 5) {
                messages.push({ role: 'system', content: `[距离上次对话已过 ${minutes}分钟]` });
            }
        }

        // 8. 工作记忆（最近对话）
        for (const msg of input.workingMemory.recentMessages) messages.push({ role: msg.role, content: msg.content });

        // 8. 当前消息
        messages.push({ role: 'user', content: input.currentMessage });
        return messages;
    }
}

export const contextBuilder = new ContextBuilder();
