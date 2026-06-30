import axios, { AxiosInstance } from 'axios';
import { ApiConfig } from '../database/schema';
import { query, queryOne, execute } from '../database/db';

export interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string; }; }
export interface ToolDefinition { type: 'function'; function: { name: string; description: string; parameters: Record<string, any>; }; }
export type ChatMessage =
    | { role: 'system' | 'user' | 'assistant'; content: string; tool_calls?: ToolCall[]; }
    | { role: 'tool'; content: string; tool_call_id: string; };
export interface ChatCompletion { id: string; choices: { message: { role: string; content: string; tool_calls?: ToolCall[]; }; finish_reason: string; }[]; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; }; }

class LLMClient {
    private chatClient: AxiosInstance | null = null;
    private embedClient: AxiosInstance | null = null;
    private config: ApiConfig | null = null;

    async loadConfig(): Promise<void> {
        this.config = await queryOne<ApiConfig>('SELECT * FROM api_configs WHERE is_active = 1 LIMIT 1');
        if (!this.config) return;

        // 聊天模型客户端
        this.chatClient = axios.create({
            baseURL: this.config.base_url,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.api_key}` },
            timeout: 60000,
        });

        // 向量模型客户端（解绑：可独立 URL/Key）
        const embedBaseUrl = this.config.embedding_base_url || this.config.base_url;
        const embedApiKey = this.config.embedding_api_key || this.config.api_key;
        this.embedClient = axios.create({
            baseURL: embedBaseUrl,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${embedApiKey}` },
            timeout: 30000,
        });
    }

    isConfigured(): boolean { return this.config !== null && this.chatClient !== null; }
    getConfig(): ApiConfig | null { return this.config; }

    async chat(messages: ChatMessage[], opts?: { temperature?: number; max_tokens?: number; tools?: ToolDefinition[] }): Promise<ChatCompletion> {
        if (!this.chatClient || !this.config) throw new Error('LLM client not configured. Please set API config in settings.');
        return this.withRetry(async () => {
            const body: any = {
                model: this.config!.model,
                messages,
                temperature: opts?.temperature ?? 0.8,
                max_tokens: opts?.max_tokens ?? 2048,
            };
            if (opts?.tools && opts.tools.length > 0) {
                body.tools = opts.tools;
                body.tool_choice = 'auto';
            }
            const response = await this.chatClient!.post('/chat/completions', body);
            return response.data;
        });
    }

    private async withRetry<T>(fn: () => Promise<T>, maxRetries: number = 2): Promise<T> {
        let lastError: any;
        for (let i = 0; i <= maxRetries; i++) {
            try { return await fn(); } catch (error: any) {
                lastError = error;
                const status = error.response?.status;
                if (status && status >= 400 && status < 500 && status !== 429) throw error;
                if (i < maxRetries) {
                    const delay = 1000 * Math.pow(2, i);
                    console.log(`[LLM] Retry ${i + 1}/${maxRetries} after ${delay}ms: ${error.message}`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        throw lastError;
    }

    async embed(text: string): Promise<number[]> {
        if (!this.embedClient || !this.config) throw new Error('Embedding client not configured.');
        const embeddingModel = this.config.embedding_model || 'text-embedding-3-small';
        console.log(`[RAG] Embedding API call: model=${embeddingModel}, text="${text.substring(0, 30)}..."`);
        try {
            const response = await this.embedClient.post('/embeddings', { model: embeddingModel, input: text });
            const vector = response.data.data[0].embedding;
            console.log(`[RAG] Embedding success: dimension=${vector.length}`);
            return vector;
        } catch (error: any) {
            console.error(`[RAG] Embedding failed: ${error.response?.data?.error?.message || error.message}`);
            throw error;
        }
    }

    // 测试聊天模型连通性
    async testChat(config: ApiConfig): Promise<{ ok: boolean; error?: string }> {
        try {
            const client = axios.create({
                baseURL: config.base_url,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.api_key}` },
                timeout: 15000,
            });
            await client.post('/chat/completions', {
                model: config.model,
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 5,
            });
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    // 测试向量模型连通性
    async testEmbed(config: ApiConfig): Promise<{ ok: boolean; error?: string }> {
        try {
            const baseUrl = config.embedding_base_url || config.base_url;
            const apiKey = config.embedding_api_key || config.api_key;
            const model = config.embedding_model || 'text-embedding-3-small';
            const client = axios.create({
                baseURL: baseUrl,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                timeout: 15000,
            });
            await client.post('/embeddings', { model, input: 'test' });
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    // 获取所有配置
    async getAllConfigs(): Promise<ApiConfig[]> {
        return query<ApiConfig>('SELECT * FROM api_configs ORDER BY is_active DESC, id DESC');
    }

    // 切换激活配置
    async setActiveConfig(id: number): Promise<void> {
        await execute('UPDATE api_configs SET is_active = 0');
        await execute('UPDATE api_configs SET is_active = 1 WHERE id = ?', [id]);
        await this.loadConfig();
    }

    // 保存配置
    async saveConfig(config: Partial<ApiConfig> & { name: string; api_key: string; base_url: string; model: string }): Promise<number> {
        if (config.id) {
            await execute(
                'UPDATE api_configs SET name=?, description=?, api_key=?, base_url=?, model=?, embedding_model=?, embedding_base_url=?, embedding_api_key=?, input_price=?, output_price=? WHERE id=?',
                [config.name, config.description || '', config.api_key, config.base_url, config.model, config.embedding_model || '', config.embedding_base_url || '', config.embedding_api_key || '', config.input_price || 0, config.output_price || 0, config.id]
            );
            return config.id;
        } else {
            const result = await execute(
                'INSERT INTO api_configs (name, description, api_key, base_url, model, embedding_model, embedding_base_url, embedding_api_key, input_price, output_price, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
                [config.name, config.description || '', config.api_key, config.base_url, config.model, config.embedding_model || '', config.embedding_base_url || '', config.embedding_api_key || '', config.input_price || 0, config.output_price || 0]
            );
            return result.lastInsertRowId;
        }
    }

    // 删除配置
    async deleteConfig(id: number): Promise<void> {
        await execute('DELETE FROM api_configs WHERE id = ?', [id]);
    }
}

export const llmClient = new LLMClient();
