import { execute, query, queryOne, withTransaction } from '../database/db';
import { MemoryNode } from '../database/schema';
import { v4 as uuidv4 } from './uuid';

export interface MemoryTags {
    factual: string[];
    nature: string[];
    source?: 'user' | 'ai' | 'cross';
}

class MemorySystem {
    async createMemory(content: string, tags: MemoryTags = { factual: [], nature: [] }, weight: number = 0.5, sessionId?: number, characterId?: number): Promise<string> {
        const id = uuidv4();
        const now = new Date().toISOString();
        await withTransaction(async () => {
            await execute(
                'INSERT INTO memory_nodes (id, session_id, character_id, content, tags, weight, status, last_accessed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, sessionId ?? null, characterId ?? null, content, JSON.stringify(tags), weight, 'active', now]
            );
            for (const tag of tags.factual) {
                await execute('INSERT INTO tags (memory_id, tag_name, tag_type) VALUES (?, ?, ?)', [id, tag, 'factual']);
            }
            for (const tag of tags.nature) {
                await execute('INSERT INTO tags (memory_id, tag_name, tag_type) VALUES (?, ?, ?)', [id, tag, 'nature']);
            }
        });
        return id;
    }

    async getMemory(id: string): Promise<MemoryNode | null> {
        const row = await queryOne<any>('SELECT * FROM memory_nodes WHERE id = ?', [id]);
        return row ? this.parseMemory(row) : null;
    }

    async searchByTags(tags: string[], tagType?: 'factual' | 'nature', characterId?: number, limit: number = 10): Promise<MemoryNode[]> {
        if (tags.length === 0) return [];
        const placeholders = tags.map(() => '?').join(',');
        const typeFilter = tagType ? 'AND t.tag_type = ?' : '';
        const charFilter = characterId ? 'AND mn.character_id = ?' : '';
        const params: any[] = [...tags];
        if (tagType) params.push(tagType);
        if (characterId) params.push(characterId);
        params.push(limit);

        const rows = await query<any>(
            `SELECT DISTINCT mn.* FROM memory_nodes mn
             JOIN tags t ON t.memory_id = mn.id
             WHERE t.tag_name IN (${placeholders}) ${typeFilter} ${charFilter}
             ORDER BY mn.weight DESC LIMIT ?`,
            params
        );
        return rows.map(r => this.parseMemory(r));
    }

    async getRecentMemories(characterId?: number, limit: number = 20): Promise<MemoryNode[]> {
        const charFilter = characterId ? 'WHERE character_id = ?' : '';
        const params = characterId ? [characterId, limit] : [limit];
        const rows = await query<any>(`SELECT * FROM memory_nodes ${charFilter} ORDER BY created_at DESC LIMIT ?`, params);
        return rows.map(r => this.parseMemory(r));
    }

    async getMemoriesSorted(sortBy: 'created_at' | 'weight' | 'access_count', characterId?: number, limit: number = 50): Promise<MemoryNode[]> {
        const charFilter = characterId ? 'WHERE character_id = ?' : '';
        const orderMap = { created_at: 'created_at DESC', weight: 'weight DESC', access_count: 'access_count DESC' };
        const params = characterId ? [characterId, limit] : [limit];
        const rows = await query<any>(`SELECT * FROM memory_nodes ${charFilter} ORDER BY ${orderMap[sortBy]} LIMIT ?`, params);
        return rows.map(r => this.parseMemory(r));
    }

    async searchByContent(keyword: string, characterId?: number, limit: number = 20): Promise<MemoryNode[]> {
        if (!keyword.trim()) return [];
        const charFilter = characterId ? 'AND character_id = ?' : '';
        const params = characterId ? [`%${keyword}%`, characterId, limit] : [`%${keyword}%`, limit];
        const rows = await query<any>(
            `SELECT * FROM memory_nodes WHERE content LIKE ? ${charFilter} ORDER BY weight DESC LIMIT ?`,
            params
        );
        return rows.map(r => this.parseMemory(r));
    }

    async searchByKeywords(keywords: string[], characterId?: number, limit: number = 20): Promise<MemoryNode[]> {
        if (keywords.length === 0) return [];
        const conditions = keywords.map(() => 'content LIKE ?').join(' OR ');
        const charFilter = characterId ? 'AND character_id = ?' : '';
        const params: any[] = keywords.map(k => `%${k}%`);
        if (characterId) params.push(characterId);
        params.push(limit);
        const rows = await query<any>(
            `SELECT DISTINCT * FROM memory_nodes WHERE (${conditions}) ${charFilter} ORDER BY weight DESC LIMIT ?`,
            params
        );
        return rows.map(r => this.parseMemory(r));
    }

    async touchMemory(id: string): Promise<void> {
        const row = await queryOne<any>('SELECT access_count, last_accessed FROM memory_nodes WHERE id = ?', [id]);
        if (!row) return;
        const daysSinceAccess = row.last_accessed
            ? (Date.now() - new Date(row.last_accessed).getTime()) / (24 * 60 * 60 * 1000)
            : 999;
        const boost = daysSinceAccess > 7
            ? 0.05
            : 0.05 * Math.exp(-0.3 * (row.access_count || 0));
        await execute(
            `UPDATE memory_nodes SET last_accessed = datetime('now'), access_count = access_count + 1, weight = MIN(1.0, weight + ?) WHERE id = ?`,
            [Math.max(0.005, boost), id]
        );
    }

    getDecayedWeight(memory: MemoryNode): number {
        if (!memory.last_accessed) return memory.weight;
        const lastAccessed = new Date(memory.last_accessed).getTime();
        const now = Date.now();
        const daysSinceAccess = (now - lastAccessed) / (24 * 60 * 60 * 1000);
        const decayFactor = Math.exp(-0.002 * daysSinceAccess);
        return memory.weight * decayFactor;
    }

    async updateStatus(id: string, status: 'active' | 'fading' | 'archived'): Promise<void> {
        await execute('UPDATE memory_nodes SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [status, id]);
    }

    async updateMemory(id: string, content: string, tags: MemoryTags): Promise<void> {
        await withTransaction(async () => {
            await execute(
                'UPDATE memory_nodes SET content = ?, tags = ?, updated_at = datetime(\'now\') WHERE id = ?',
                [content, JSON.stringify(tags), id]
            );
            await execute('DELETE FROM tags WHERE memory_id = ?', [id]);
            for (const tag of tags.factual) {
                await execute('INSERT INTO tags (memory_id, tag_name, tag_type) VALUES (?, ?, ?)', [id, tag, 'factual']);
            }
            for (const tag of tags.nature) {
                await execute('INSERT INTO tags (memory_id, tag_name, tag_type) VALUES (?, ?, ?)', [id, tag, 'nature']);
            }
        });
    }

    async deleteMemory(id: string): Promise<void> {
        await withTransaction(async () => {
            await execute('DELETE FROM tags WHERE memory_id = ?', [id]);
            await execute('DELETE FROM memory_vectors WHERE memory_id = ?', [id]);
            await execute('DELETE FROM memory_relations WHERE source_id = ? OR target_id = ?', [id, id]);
            await execute('DELETE FROM memory_nodes WHERE id = ?', [id]);
        });
    }

    async dedupMemory(content: string, tags: MemoryTags, characterId: number): Promise<'new' | 'merged' | 'downweighted'> {
        if (tags.factual.length === 0) return 'new';
        const placeholders = tags.factual.map(() => '?').join(',');
        const candidates = await query<any>(
            `SELECT mn.* FROM memory_nodes mn
             JOIN tags t ON t.memory_id = mn.id
             WHERE mn.character_id = ? AND mn.status = 'active'
             AND t.tag_name IN (${placeholders}) AND t.tag_type = 'factual'
             GROUP BY mn.id
             HAVING COUNT(DISTINCT t.tag_name) = ?`,
            [characterId, ...tags.factual, tags.factual.length]
        );
        const exactMatches = candidates.filter(row => {
            const rowTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
            const rowNature = rowTags.nature || [];
            return rowNature.length === tags.nature.length &&
                   tags.nature.every(n => rowNature.includes(n));
        });
        if (exactMatches.length === 0) return 'new';
        for (const row of exactMatches) {
            const sim = contentSimilarity(content, row.content);
            if (sim > 0.8) return 'merged';
            if (sim > 0.6) return 'downweighted';
        }
        return 'new';
    }

    private parseMemory(row: any): MemoryNode {
        const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
        if (Array.isArray(tags)) {
            return { ...row, tags: { factual: tags, nature: [] } };
        }
        return { ...row, tags };
    }
}

function contentSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.match(/[\u4e00-\u9fff]{2,}|[a-zA-Z]+/g) || []);
    const wordsB = new Set(b.match(/[\u4e00-\u9fff]{2,}|[a-zA-Z]+/g) || []);
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let overlap = 0;
    for (const w of wordsA) if (wordsB.has(w)) overlap++;
    return overlap / Math.max(wordsA.size, wordsB.size);
}

export const memorySystem = new MemorySystem();
