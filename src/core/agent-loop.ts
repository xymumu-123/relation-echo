import { llmClient } from '../api/llm-client';
import { tokenTracker } from '../api/token-tracker';
import { contextBuilder, ContextInput } from './context-builder';
import { sessionManager } from './session-manager';
import { crisisDetector } from '../crisis/crisis-detector';
import { CRISIS_RESPONSE_PROMPT } from './core-system';
import { memoryExtractor } from '../memory/memory-extractor';
import { sessionSummaryGenerator } from './session-summary';
import { userProfileManager } from '../profile/user-profile';
import { toolRegistry } from '../tools/tool-registry';

export interface AgentResponse { content: string; isCrisis: boolean; usedFastPath: boolean; tokensUsed: { prompt: number; completion: number; }; }

const EMOTION_KEYWORDS = ['难过', '伤心', '烦', '累', '压力', '焦虑', '害怕', '孤独', '开心', '高兴', '快乐', '兴奋', '感动', '幸福', '生气', '愤怒', '烦躁', '郁闷', '沮丧', '失落', '想哭', '崩溃', '撑不下去', '受不了', '太难了'];
const CHAT_KEYWORDS = ['你好', '在吗', '今天', '干嘛', '吃了吗', '早上好', '晚安', '嗯', '哦', '好的', '哈哈', '嗯嗯', '是的', '对'];

class AgentLoop {
    private classifyIntent(message: string): 'emotion' | 'chat' | 'task' {
        const lower = message.toLowerCase();
        if (EMOTION_KEYWORDS.some(k => lower.includes(k))) return 'emotion';
        if (CHAT_KEYWORDS.some(k => lower.includes(k)) && message.length < 20) return 'chat';
        return 'task';
    }

    async process(sessionId: number, characterId: number, message: string, contextInput: ContextInput): Promise<AgentResponse> {
        if (crisisDetector.detect(message)) return { content: CRISIS_RESPONSE_PROMPT, isCrisis: true, usedFastPath: true, tokensUsed: { prompt: 0, completion: 0 } };
        const intent = this.classifyIntent(message);
        if (intent === 'emotion' || intent === 'chat') return this.fastPath(sessionId, characterId, contextInput);
        return this.fullPath(sessionId, characterId, contextInput);
    }

    private async fastPath(sessionId: number, characterId: number, contextInput: ContextInput): Promise<AgentResponse> {
        const messages = contextBuilder.buildMessages(contextInput);
        const completion = await llmClient.chat(messages);
        const { prompt_tokens, completion_tokens } = completion.usage;
        await tokenTracker.recordUsage(sessionId, prompt_tokens, completion_tokens);

        const responseContent = completion.choices[0].message.content;

        this.reflect(contextInput.currentMessage, responseContent, sessionId, contextInput.workingMemory.turnCount, characterId).catch(console.error);

        return { content: responseContent, isCrisis: false, usedFastPath: true, tokensUsed: { prompt: prompt_tokens, completion: completion_tokens } };
    }

    private async fullPath(sessionId: number, characterId: number, contextInput: ContextInput): Promise<AgentResponse> {
        const messages = contextBuilder.buildMessages(contextInput);
        const toolDefs = toolRegistry.getToolDefinitions();

        let totalPrompt = 0, totalCompletion = 0;
        const MAX_TOOL_ROUNDS = 3;

        let completion = await llmClient.chat(messages, { tools: toolDefs.length > 0 ? toolDefs : undefined });
        totalPrompt += completion.usage.prompt_tokens;
        totalCompletion += completion.usage.completion_tokens;

        let round = 0;
        while (completion.choices[0].message.tool_calls && round < MAX_TOOL_ROUNDS) {
            round++;
            const toolCalls = completion.choices[0].message.tool_calls;
            console.log(`[AgentLoop] Tool call round ${round}: ${toolCalls.map(tc => tc.function.name).join(', ')}`);

            messages.push({ role: 'assistant', content: completion.choices[0].message.content || '', tool_calls: toolCalls });

            for (const tc of toolCalls) {
                let args: Record<string, any> = {};
                try { args = JSON.parse(tc.function.arguments); } catch {}
                console.log(`[AgentLoop] Executing tool: ${tc.function.name}(${JSON.stringify(args)})`);
                const result = await toolRegistry.execute(tc.function.name, args);
                console.log(`[AgentLoop] Tool result: ${result.success ? 'ok' : result.error}`);
                messages.push({ role: 'tool', content: result.success ? (result.data || '') : `Error: ${result.error}`, tool_call_id: tc.id });
            }

            completion = await llmClient.chat(messages, { tools: toolDefs.length > 0 ? toolDefs : undefined });
            totalPrompt += completion.usage.prompt_tokens;
            totalCompletion += completion.usage.completion_tokens;
        }

        if (round > 0) console.log(`[AgentLoop] Tool loop finished after ${round} rounds`);
        await tokenTracker.recordUsage(sessionId, totalPrompt, totalCompletion);
        const responseContent = completion.choices[0].message.content || '';
        this.reflect(contextInput.currentMessage, responseContent, sessionId, contextInput.workingMemory.turnCount, characterId).catch(console.error);
        return { content: responseContent, isCrisis: false, usedFastPath: false, tokensUsed: { prompt: totalPrompt, completion: totalCompletion } };
    }

    // 反思阶段：记忆提取 + 会话摘要 + 用户画像
    // 通过查询数据库实际数据来判断是否触发，避免 app 重启后重复触发
    private async reflect(userMessage: string, aiResponse: string, sessionId: number, turnCount: number, characterId: number): Promise<void> {
        try {
            const round = Math.floor(turnCount / 2);
            console.log(`[Reflect] turnCount=${turnCount}, round=${round}, sessionId=${sessionId}, characterId=${characterId}`);

            // 每5条消息（用户+AI）触发记忆提取
            try {
                const msgsSinceMemory = await sessionManager.getMessagesSinceLastMemory(sessionId, characterId);
                if (msgsSinceMemory >= 5) {
                    console.log(`[Reflect] Extracting memory (${msgsSinceMemory} msgs since last)`);
                    const msgsForExtraction = await sessionManager.getMessagesForExtraction(sessionId);
                    if (msgsForExtraction.length >= 2) {
                        await memoryExtractor.extractFromConversation(msgsForExtraction, sessionId, characterId);
                    }
                }
            } catch (memoryError) {
                console.error('[Reflect] Memory extraction failed:', memoryError);
            }

            // 每5轮生成会话摘要（自上次摘要以来 >= 5 条用户消息）
            try {
                const msgsSinceSummary = await sessionManager.getMessagesSinceLastSummary(sessionId);
                if (msgsSinceSummary >= 5) {
                    console.log(`[Reflect] Generating summary (${msgsSinceSummary} user msgs since last)`);
                    const recentMsgs = await sessionManager.getRecentMessages(sessionId, 10);
                    await sessionSummaryGenerator.generateSummary(sessionId, recentMsgs);
                }
            } catch (summaryError) {
                console.error('[Reflect] Summary generation failed:', summaryError);
            }

            // 每20轮更新用户画像（自上次更新以来 >= 20 条用户消息）
            try {
                const msgsSinceProfile = await sessionManager.getMessagesSinceLastProfileUpdate();
                console.log(`[Reflect] Profile check: ${msgsSinceProfile} user msgs since last, threshold=20`);
                if (msgsSinceProfile >= 20) {
                    console.log(`[Reflect] Updating profile (${msgsSinceProfile} user msgs since last)`);
                    const recentMsgs = await sessionManager.getRecentMessages(sessionId, 40);
                    console.log(`[Reflect] Got ${recentMsgs.length} recent msgs for profile extraction`);
                    await userProfileManager.extractFromConversation(recentMsgs, -1);
                }
            } catch (profileError) {
                console.error('[Reflect] Profile update failed:', profileError);
            }
        } catch (error) {
            console.error('[AgentLoop] Reflect failed:', error);
        }
    }
}

export const agentLoop = new AgentLoop();
