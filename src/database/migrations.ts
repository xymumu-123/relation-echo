import { getDatabase } from './db';
import { DB_VERSION } from './schema';

// 版本变更时需要清空的表（只列有结构变动的表）
const VERSION_TABLE_MAP: Record<number, string[]> = {
    5: ['characters'],                                          // 人格结构升级
    6: ['sessions', 'messages', 'session_summaries',            // 加索引（索引自动处理，但 memory_nodes 加了 character_id）
        'memory_nodes', 'memory_vectors', 'memory_relations',
        'tags', 'token_usage'],
};

export async function runMigrations(): Promise<void> {
    const db = await getDatabase();
    await db.execAsync(`CREATE TABLE IF NOT EXISTS db_meta (key TEXT PRIMARY KEY, value TEXT);`);
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM db_meta WHERE key = 'version'");
    const currentVersion = row ? parseInt(row.value, 10) : 0;

    if (currentVersion >= DB_VERSION) return;

    // 清空有结构变动的表
    for (let v = currentVersion + 1; v <= DB_VERSION; v++) {
        const tables = VERSION_TABLE_MAP[v];
        if (tables) {
            for (const table of tables) {
                await db.execAsync(`DELETE FROM ${table}`);
                console.log(`[Migration] Cleared table: ${table}`);
            }
        }
    }

    // 确保所有索引存在
    await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sessions_character_id ON sessions(character_id);
        CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_memory_nodes_character_id ON memory_nodes(character_id);
        CREATE INDEX IF NOT EXISTS idx_memory_nodes_session_id ON memory_nodes(session_id);
        CREATE INDEX IF NOT EXISTS idx_memory_nodes_weight ON memory_nodes(weight DESC);
        CREATE INDEX IF NOT EXISTS idx_memory_nodes_status ON memory_nodes(status);
        CREATE INDEX IF NOT EXISTS idx_tags_memory_id ON tags(memory_id);
        CREATE INDEX IF NOT EXISTS idx_tags_name_type ON tags(tag_name, tag_type);
        CREATE INDEX IF NOT EXISTS idx_relationships_character_id ON relationships(character_id);
        CREATE INDEX IF NOT EXISTS idx_character_moods_character_id ON character_moods(character_id);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_character_id ON user_profiles(character_id);
        CREATE INDEX IF NOT EXISTS idx_session_summaries_session_id ON session_summaries(session_id);
        CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage(session_id);
        CREATE INDEX IF NOT EXISTS idx_memory_vectors_memory_id ON memory_vectors(memory_id);
    `);

    await db.runAsync("INSERT OR REPLACE INTO db_meta (key, value) VALUES ('version', ?)", [String(DB_VERSION)]);
    console.log(`[Migration] Database version updated: ${currentVersion} -> ${DB_VERSION}`);
}
