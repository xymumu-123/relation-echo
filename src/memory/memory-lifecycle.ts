import { query, execute } from '../database/db';
import { MemoryNode } from '../database/schema';

// 记忆生命周期管理
// 权重随时间衰减，但永不为零
// 公式：当前权重 = 基础权重 × e^(-0.002 × 距上次访问天数)

class MemoryLifecycle {
    // 评估所有记忆的权重衰减
    async evaluateMemories(): Promise<void> {
        const memories = await query<MemoryNode>('SELECT * FROM memory_nodes');
        const now = Date.now();

        for (const memory of memories) {
            const lastAccessed = memory.last_accessed
                ? new Date(memory.last_accessed).getTime()
                : new Date(memory.created_at || 0).getTime();

            const daysSinceAccess = (now - lastAccessed) / (24 * 60 * 60 * 1000);
            const decayFactor = Math.exp(-0.002 * daysSinceAccess);
            const decayedWeight = memory.weight * decayFactor;

            // 更新 last_accessed 时间戳（用于前端显示）
            // 注意：这里不更新 weight 字段，因为 weight 是基础权重
            // 实时权重通过 getDecayedWeight() 计算
        }
    }

    // 获取记忆的实时权重（基础权重 × 衰减系数）
    getDecayedWeight(memory: MemoryNode): number {
        if (!memory.last_accessed) return memory.weight;
        const lastAccessed = new Date(memory.last_accessed).getTime();
        const now = Date.now();
        const daysSinceAccess = (now - lastAccessed) / (24 * 60 * 60 * 1000);
        const decayFactor = Math.exp(-0.002 * daysSinceAccess);
        return memory.weight * decayFactor;
    }

    // 权重衰减公式
    // 当前权重 = 基础权重 × e^(-0.002 × 距上次访问天数)
    // 效果：
    // - 第 0 天：系数 1.0（原始权重）
    // - 第 30 天：系数 0.942
    // - 第 100 天：系数 0.819
    // - 第 365 天：系数 0.482
    // - 第 730 天：系数 0.232
    // - 第 1000 天：系数 0.135
    // - 永远不会等于 0
}

export const memoryLifecycle = new MemoryLifecycle();
