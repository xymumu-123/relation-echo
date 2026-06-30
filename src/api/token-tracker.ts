import { execute, query } from '../database/db';
import { TokenUsage } from '../database/schema';

class TokenTracker {
    private sessionPromptTokens = 0;
    private sessionCompletionTokens = 0;
    private sessionEmbeddingTokens = 0;

    async recordUsage(sessionId: number, promptTokens: number, completionTokens: number, embeddingTokens: number = 0): Promise<void> {
        this.sessionPromptTokens += promptTokens;
        this.sessionCompletionTokens += completionTokens;
        this.sessionEmbeddingTokens += embeddingTokens;
        const cost = await this.estimateCost(promptTokens, completionTokens, embeddingTokens);
        try {
            await execute('INSERT INTO token_usage (session_id, prompt_tokens, completion_tokens, embedding_tokens, cost_estimate) VALUES (?, ?, ?, ?, ?)', [sessionId, promptTokens, completionTokens, embeddingTokens, cost]);
        } catch (e) {
            console.error('[TokenTracker] Failed to record usage:', e);
        }
    }

    private async estimateCost(promptTokens: number, completionTokens: number, embeddingTokens: number): Promise<number> {
        try {
            const rows = await query<any>('SELECT input_price, output_price FROM api_configs WHERE is_active = 1 LIMIT 1');
            const config = rows[0];
            if (config && config.input_price > 0) {
                return (promptTokens * config.input_price + completionTokens * config.output_price) / 1000000;
            }
        } catch {}
        return 0;
    }

    getSessionStats() {
        return { promptTokens: this.sessionPromptTokens, completionTokens: this.sessionCompletionTokens, embeddingTokens: this.sessionEmbeddingTokens, estimatedCost: 0 };
    }

    async getTotalStats(): Promise<{ totalPromptTokens: number; totalCompletionTokens: number; totalEmbeddingTokens: number; totalCost: number }> {
        const rows = await query<any>('SELECT COALESCE(SUM(prompt_tokens), 0) as p, COALESCE(SUM(completion_tokens), 0) as c, COALESCE(SUM(embedding_tokens), 0) as e, COALESCE(SUM(cost_estimate), 0) as cost FROM token_usage');
        const row = rows[0];
        return {
            totalPromptTokens: Number(row?.p) || 0,
            totalCompletionTokens: Number(row?.c) || 0,
            totalEmbeddingTokens: Number(row?.e) || 0,
            totalCost: Number(row?.cost) || 0,
        };
    }

    reset(): void { this.sessionPromptTokens = 0; this.sessionCompletionTokens = 0; this.sessionEmbeddingTokens = 0; }
}

export const tokenTracker = new TokenTracker();
