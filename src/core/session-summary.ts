import { llmClient, ChatMessage } from '../api/llm-client';
import { execute, query } from '../database/db';
import { Message, SessionSummary } from '../database/schema';

const SUMMARY_PROMPT = `你是一个对话摘要专家。请将以下对话压缩为简洁的摘要，保留关键信息和情感基调。

摘要要求：
1. 保留对话的主要话题
2. 保留用户表达的重要信息（偏好、事件、情感等）
3. 保留对话的情感基调
4. 简洁明了，不超过200字

输出格式：
直接输出摘要文本，不要有其他文字。`;

class SessionSummaryGenerator {
    async generateSummary(sessionId: number, messages: Message[]): Promise<void> {
        if (!llmClient.isConfigured() || messages.length === 0) return;

        const conversationText = messages.map(m =>
            `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`
        ).join('\n');

        const chatMessages: ChatMessage[] = [
            { role: 'system', content: SUMMARY_PROMPT },
            { role: 'user', content: conversationText },
        ];

        try {
            const completion = await llmClient.chat(chatMessages);
            const summary = completion.choices[0].message.content;

            const firstId = messages[0].id;
            const lastId = messages[messages.length - 1].id;
            const messageRange = `${firstId}-${lastId}`;

            // 滚动队列：每次 INSERT 新摘要，保留最新 10 条
            await execute(
                'INSERT INTO session_summaries (session_id, summary, message_range) VALUES (?, ?, ?)',
                [sessionId, summary, messageRange]
            );

            // 淘汰旧摘要，只保留最新 10 条
            await execute(
                `DELETE FROM session_summaries WHERE session_id = ? AND id NOT IN (
                    SELECT id FROM session_summaries WHERE session_id = ? ORDER BY id DESC LIMIT 10
                )`,
                [sessionId, sessionId]
            );

            console.log('[SessionSummary] Generated for session:', sessionId);
        } catch (error) {
            console.error('[SessionSummary] Failed:', error);
        }
    }

}

export const sessionSummaryGenerator = new SessionSummaryGenerator();
