import { execute, query } from '../database/db';
import { MemoryVector, MemoryNode } from '../database/schema';
import { llmClient } from '../api/llm-client';
import { memorySystem } from './memory-system';

export interface ScoredMemory { memory: MemoryNode; vectorScore: number; tagScore: number; weightScore: number; finalScore: number; }

class VectorStore {
    async storeVector(memoryId: string, vector: number[], model: string): Promise<void> {
        await execute('INSERT OR REPLACE INTO memory_vectors (memory_id, vector, model, dimension) VALUES (?, ?, ?, ?)', [memoryId, JSON.stringify(vector), model, vector.length]);
    }

    async embedAndStore(memoryId: string, text: string): Promise<void> {
        if (!llmClient.isConfigured()) { console.log('[RAG] embedAndStore skip: LLM not configured'); return; }
        try {
            const vector = await llmClient.embed(text);
            const config = llmClient.getConfig();
            const model = config?.embedding_model || 'text-embedding-3-small';
            await this.storeVector(memoryId, vector, model);
            console.log(`[RAG] Vector stored: memoryId=${memoryId.substring(0, 8)}... dim=${vector.length}`);
        } catch (error) { console.error('[RAG] embedAndStore failed:', error); }
    }

    async vectorSearch(queryText: string, topN: number = 10, characterId?: number): Promise<ScoredMemory[]> {
        if (!llmClient.isConfigured()) { console.log('[RAG] vectorSearch skip: LLM not configured'); return []; }
        try {
            const queryVector = await llmClient.embed(queryText);
            const joinFilter = characterId ? 'JOIN memory_nodes mn ON mv.memory_id = mn.id WHERE mn.character_id = ?' : '';
            const allVectors = characterId
                ? await query<MemoryVector>(`SELECT mv.* FROM memory_vectors mv ${joinFilter}`, [characterId])
                : await query<MemoryVector>('SELECT * FROM memory_vectors');
            console.log(`[RAG] vectorSearch: queryDim=${queryVector.length}, storedVectors=${allVectors.length}`);
            if (allVectors.length === 0) { console.log('[RAG] vectorSearch: memory_vectors table is empty, RAG will fallback'); return []; }

            // 批量查询 memory_nodes，避免 N+1
            const memoryIds = allVectors.map(v => v.memory_id);
            const placeholders = memoryIds.map(() => '?').join(',');
            const nodes = await query<any>(
                `SELECT * FROM memory_nodes WHERE id IN (${placeholders})`,
                memoryIds
            );
            const nodeMap = new Map<string, any>();
            for (const n of nodes) nodeMap.set(n.id, n);

            const scored: ScoredMemory[] = [];
            for (const vec of allVectors) {
                const storedVector = JSON.parse(typeof vec.vector === 'string' ? vec.vector : '[]');
                if (!Array.isArray(storedVector) || storedVector.length === 0) continue;
                const similarity = cosineSimilarity(queryVector, storedVector);
                const row = nodeMap.get(vec.memory_id);
                if (row) {
                    const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
                    const memory: MemoryNode = { ...row, tags: Array.isArray(tags) ? { factual: tags, nature: [] } : tags };
                    scored.push({ memory, vectorScore: similarity, tagScore: 0, weightScore: 0, finalScore: 0 });
                }
            }
            scored.sort((a, b) => b.vectorScore - a.vectorScore);
            const top = scored.slice(0, topN);
            if (top.length > 0) console.log(`[RAG] vectorSearch results: top=${(top[0].vectorScore * 100).toFixed(1)}%, count=${top.length}`);
            return top;
        } catch (error) { console.error('[RAG] vectorSearch failed:', error); return []; }
    }

    // 混合检索：向量 50% + 标签 30% + 权重 20%
    // 注意：此方法只返回记忆，不执行 touchMemory
    // touchMemory 由上层（context-builder）在记忆真正被注入 LLM 时调用
    async hybridSearch(queryText: string, queryTags: string[] = [], topN: number = 15, characterId?: number): Promise<MemoryNode[]> {
        // 1. 向量检索
        let vectorResults = await this.vectorSearch(queryText, topN * 2, characterId);

        // 2. LIKE 关键词兜底（提取名词/关键词，不用整段话）
        if (vectorResults.length === 0) {
            const keywords = extractKeywords(queryText);
            console.log(`[RAG] Vector search empty, fallback to keywords: [${keywords.join(', ')}]`);
            if (keywords.length > 0) {
                const likeResults = await memorySystem.searchByKeywords(keywords, characterId, topN * 2);
                console.log(`[RAG] Keyword search returned ${likeResults.length} memories`);
                vectorResults = likeResults.map(m => ({
                    memory: m, vectorScore: 0.4, tagScore: 0, weightScore: 0, finalScore: 0,
                }));
            }
        } else {
            console.log(`[RAG] Using vector search: ${vectorResults.length} memories`);
        }

        // 3. 标签检索（只在有标签时执行）
        let allTagResults: MemoryNode[] = [];
        if (queryTags.length > 0) {
            const factualTagResults = await memorySystem.searchByTags(queryTags, 'factual', characterId, topN * 2);
            const natureTagResults = await memorySystem.searchByTags(queryTags, 'nature', characterId, topN * 2);
            allTagResults = [...factualTagResults, ...natureTagResults];
        }

        // 4. 合并评分
        const combined = new Map<string, ScoredMemory>();

        for (const r of vectorResults) {
            combined.set(r.memory.id, { ...r });
        }

        for (const r of allTagResults) {
            const existing = combined.get(r.id);
            if (existing) {
                existing.tagScore = 1.0;
            } else {
                combined.set(r.id, { memory: r, vectorScore: 0, tagScore: 1.0, weightScore: 0, finalScore: 0 });
            }
        }

        // 5. 计算最终分数（含权重衰减）
        for (const item of combined.values()) {
            const decayedWeight = memorySystem.getDecayedWeight(item.memory);
            item.weightScore = decayedWeight;
            item.finalScore = item.vectorScore * 0.5 + item.tagScore * 0.3 + item.weightScore * 0.2;
        }

        // 6. 排序 + 标签重合惩罚（同组记忆不会轻易挤掉其他组）
        const sorted = Array.from(combined.values()).sort((a, b) => b.finalScore - a.finalScore);
        const results: ScoredMemory[] = [];
        const selectedTagSets: string[][] = [];
        for (const item of sorted) {
            const itemTags = item.memory.tags.factual;
            const hasOverlap = selectedTagSets.some(tags => {
                if (itemTags.length === 0 || tags.length === 0) return false;
                const overlap = tags.filter(t => itemTags.includes(t)).length;
                return overlap / Math.max(tags.length, itemTags.length) > 0.5;
            });
            if (hasOverlap) item.finalScore *= 0.85;
            results.push(item);
            selectedTagSets.push(itemTags);
            if (results.length >= topN) break;
        }
        results.sort((a, b) => b.finalScore - a.finalScore);

        // 7. 如果所有检索都无结果，返回最近的高权重记忆作为兜底
        if (results.length === 0) {
            console.log('[RAG] All search empty, fallback to recent memories');
            return memorySystem.getRecentMemories(characterId, Math.min(3, topN));
        }

        const finalMemories = results.map(s => s.memory);
        console.log(`[RAG] hybridSearch final: ${finalMemories.length} memories returned`);
        return finalMemories;
    }
}

// 从用户消息中提取关键词（用于 LIKE 搜索）
function extractKeywords(text: string): string[] {
    // 移除标点和常见停用词
    const stopWords = new Set([
        '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '这', '那',
        '有', '和', '与', '或', '但', '就', '都', '也', '还', '又', '再',
        '很', '太', '非常', '特别', '比较', '最',
        '吗', '呢', '吧', '啊', '呀', '哦', '嗯', '哈',
        '想', '要', '会', '能', '可以', '应该', '需要',
        '什么', '怎么', '哪', '谁', '为什么', '多少',
        '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
        '个', '些', '点', '多', '少',
        '今天', '明天', '昨天', '现在', '刚才', '以前',
        '不', '没', '没有', '别',
    ]);

    // 用正则提取中文词组（2-6字）和英文单词
    const segments = text.match(/[\u4e00-\u9fff]{2,6}|[a-zA-Z]+/g) || [];
    return segments.filter(w => !stopWords.has(w) && w.length >= 2).slice(0, 5);
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) { dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

export const vectorStore = new VectorStore();
