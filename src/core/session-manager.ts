import { execute, query } from '../database/db';
import { Message, SessionSummary } from '../database/schema';

export interface WorkingMemory { recentMessages: Message[]; summaries: SessionSummary[]; turnCount: number; }

class SessionManager {
    private workingMemorySize = 5;

    async createSession(characterId: number, title?: string): Promise<number> {
        const result = await execute('INSERT INTO sessions (character_id, title) VALUES (?, ?)', [characterId, title ?? `对话 ${new Date().toLocaleString()}`]);
        return result.lastInsertRowId;
    }

    async addMessage(sessionId: number, role: 'user' | 'assistant', content: string): Promise<number> {
        const now = new Date().toISOString();
        const result = await execute('INSERT INTO messages (session_id, role, content, sent_at) VALUES (?, ?, ?, ?)', [sessionId, role, content, now]);
        return result.lastInsertRowId;
    }

    async getWorkingMemory(sessionId: number): Promise<WorkingMemory> {
        const recentMessages = await query<Message>(`SELECT * FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?`, [sessionId, this.workingMemorySize * 2]);
        recentMessages.reverse();
        const summaries = await query<SessionSummary>(`SELECT * FROM session_summaries WHERE session_id = ? ORDER BY id DESC LIMIT 10`, [sessionId]);
        const countRows = await query<any>('SELECT COUNT(*) as cnt FROM messages WHERE session_id = ?', [sessionId]);
        return { recentMessages, summaries, turnCount: countRows[0]?.cnt ?? 0 };
    }

    async getRecentMessages(sessionId: number, count: number): Promise<Message[]> {
        const rows = await query<Message>(`SELECT * FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?`, [sessionId, count]);
        rows.reverse();
        return rows;
    }

    // 以下三个方法用于 reflect 阶段判断是否需要触发后台任务
    // 通过查询数据库实际数据来判断，避免 app 重启后重复触发

    /** 自上次记忆提取以来的总消息数（用户+AI） */
    async getMessagesSinceLastMemory(sessionId: number, characterId: number): Promise<number> {
        const rows = await query<any>(
            `SELECT created_at FROM memory_nodes WHERE session_id = ? AND character_id = ? ORDER BY created_at DESC LIMIT 1`,
            [sessionId, characterId]
        );
        if (rows.length === 0) {
            const result = await query<any>(
                `SELECT COUNT(*) as cnt FROM messages WHERE session_id = ?`,
                [sessionId]
            );
            return result[0]?.cnt ?? 0;
        }
        const result = await query<any>(
            `SELECT COUNT(*) as cnt FROM messages WHERE session_id = ? AND created_at > ?`,
            [sessionId, rows[0].created_at]
        );
        return result[0]?.cnt ?? 0;
    }

    /** 自上次摘要生成以来的用户消息数 */
    async getMessagesSinceLastSummary(sessionId: number): Promise<number> {
        const rows = await query<any>(
            `SELECT created_at FROM session_summaries WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
            [sessionId]
        );
        if (rows.length === 0) return 999;
        const result = await query<any>(
            `SELECT COUNT(*) as cnt FROM messages WHERE session_id = ? AND role = 'user' AND created_at > ?`,
            [sessionId, rows[0].created_at]
        );
        return result[0]?.cnt ?? 999;
    }

    /** 自上次画像更新以来的用户消息数 */
    async getMessagesSinceLastProfileUpdate(): Promise<number> {
        const rows = await query<any>(
            `SELECT updated_at FROM user_profiles WHERE character_id = -1 ORDER BY updated_at DESC LIMIT 1`
        );
        if (rows.length === 0) return 999;
        const result = await query<any>(
            `SELECT COUNT(*) as cnt FROM messages WHERE role = 'user' AND created_at > ?`,
            [rows[0].updated_at]
        );
        return result[0]?.cnt ?? 999;
    }

    /** 获取最近 6 条消息用于记忆提取 */
    async getMessagesForExtraction(sessionId: number): Promise<Message[]> {
        return this.getRecentMessages(sessionId, 6);
    }
}

export const sessionManager = new SessionManager();
