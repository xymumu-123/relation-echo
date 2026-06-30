import { llmClient, ChatMessage } from '../api/llm-client';
import { memorySystem } from './memory-system';
import { vectorStore } from './vector-store';
import { Message } from '../database/schema';

export interface ExtractedMemory {
    shouldRemember: boolean;
    content: string;
    factualTags: string[];
    natureTags: string[];
    source: 'user' | 'ai' | 'cross';
    weight: number;
}

const EXTRACTION_PROMPT = `你是一个记忆提取专家。分析以下对话，从中提取值得长期记住的信息。

## 提取来源分类
每条记忆必须标注来源：
- **user**：用户本人的事实、偏好、经历。如"用户爱吃辣"、"用户是湖北人"
- **ai**：AI角色自己说的话、编的故事、表达的偏好。如"小雨说最喜欢Love Story这首歌"、"小雨提到以前养过一只猫"
- **cross**：双方互动中产生的情感、评价、共识。如"用户觉得小雨很聪明"、"用户和小雨都喜欢周杰伦"

## 重要规则
1. 从**所有参与者**的消息中提取信息，不只是用户
2. AI角色自己说的角色经历、偏好、故事也要记录（这是角色一致性的重要依据）
3. 如果只是回应（如"嗯"、"对"、"好的"），且没有新的实质性信息，不提取
4. 闲聊寒暄（你好、在吗、哈哈、嗯嗯）不提取
5. 只提取本轮对话中**新增**的信息，不要重复之前已有的内容

## 据实标签（第一层 - 关于什么）
从对话内容中提取**具体关键词**作为标签，不要使用笼统的大类。
- 错误示例：人物与关系、物品与消费、空间与地点
- 正确示例：宠物、猫、美短、火锅、北京、生日、妈妈、公司聚餐、感冒、Taylor Swift

每条记忆至少2个、最多4个精确标签。

## 记忆分类（第二层 - 什么性质）
从以下7种中选择（可多选）：
- 事实信息：客观存在的属性或发生过的事情
- 个人偏好：主观的喜好、厌恶、习惯倾向
- 事件经历：有起止时间、有情节的故事片段
- 情绪感受：某个瞬间的心理状态或情感
- 知识技能：学到的规律、经验或方法
- 人际动态：关于他人性格或互动模式的认知
- 目标计划：面向未来的意图、愿望或待办

## 权重评估（0.1-1.0）
- 0.9-1.0：强烈要求记住
- 0.7-0.9：重要人生事件（工作、感情、健康）
- 0.5-0.7：个人偏好、习惯、宠物、家庭、角色重要经历
- 0.3-0.5：日常对话中的普通信息
- 0.1-0.3：无关紧要的细节

## 输出格式（JSON数组）
[{"shouldRemember": true, "content": "精炼的记忆内容", "factualTags": ["具体标签1", "具体标签2"], "natureTags": ["分类"], "source": "user/ai/cross", "weight": 0.7}]

如果没有值得记住的信息：
[{"shouldRemember": false}]

只返回JSON，不要有其他文字。`;

export class MemoryExtractor {
    async extractFromConversation(
        recentMessages: Message[],
        sessionId: number,
        characterId?: number
    ): Promise<void> {
        if (!llmClient.isConfigured() || recentMessages.length === 0) return;

        const conversationText = recentMessages.map(m =>
            `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`
        ).join('\n');

        const chatMessages: ChatMessage[] = [
            { role: 'system', content: EXTRACTION_PROMPT },
            { role: 'user', content: `【最近对话】\n${conversationText}` },
        ];

        try {
            const completion = await llmClient.chat(chatMessages, { temperature: 0.3 });
            const raw = completion.choices[0].message.content;

            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return;

            const results: ExtractedMemory[] = JSON.parse(jsonMatch[0]);

            for (const item of results) {
                if (!item.shouldRemember || !item.content) continue;

                const source = item.source || 'user';
                const tags = { factual: item.factualTags || [], nature: item.natureTags || [], source };
                let weight = Math.max(0.01, Math.min(1.0, item.weight || 0.5));

                // 去重检查（同角色范围）
                if (characterId) {
                    const dedup = await memorySystem.dedupMemory(item.content, tags, characterId);
                    if (dedup === 'merged') {
                        console.log(`[RAG] Memory merged (duplicate): "${item.content.substring(0, 30)}..."`);
                        continue;
                    }
                    if (dedup === 'downweighted') {
                        weight = weight * 0.5;
                        console.log(`[RAG] Memory downweighted: "${item.content.substring(0, 30)}..."`);
                    }
                }

                const memoryId = await memorySystem.createMemory(
                    item.content,
                    tags,
                    weight,
                    sessionId,
                    characterId
                );

                console.log(`[RAG] Memory created: id=${memoryId.substring(0, 8)}... source=${source} content="${item.content.substring(0, 30)}..." weight=${item.weight} tags=${JSON.stringify(item.factualTags)}`);

                vectorStore.embedAndStore(memoryId, item.content).catch(err => {
                    console.error(`[RAG] Vector store failed for memory ${memoryId.substring(0, 8)}...:`, err);
                });
            }
        } catch (error) {
            console.error('[MemoryExtractor] Failed:', error);
        }
    }
}

export const memoryExtractor = new MemoryExtractor();
