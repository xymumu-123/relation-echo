import * as SQLite from 'expo-sqlite';
import { DB_NAME, CREATE_TABLES } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initTables(db);
    return db;
}

// 删除数据库并重建所有表（保留 api_configs）
export async function resetDatabase(): Promise<void> {
    // 1. 备份 api_configs
    let savedConfigs: any[] = [];
    try {
        if (!db) db = await SQLite.openDatabaseAsync(DB_NAME);
        savedConfigs = await db.getAllAsync('SELECT * FROM api_configs');
        console.log(`[DB] Backing up ${savedConfigs.length} api configs`);
    } catch (e) {
        console.log('[DB] No api_configs to backup (first run)');
    }

    // 2. 删除并重建数据库
    if (db) { await db.closeAsync(); db = null; }
    await SQLite.deleteDatabaseAsync(DB_NAME);
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initTables(db);

    // 3. 恢复 api_configs
    if (savedConfigs.length > 0) {
        try {
            for (const c of savedConfigs) {
                await db.runAsync(
                    'INSERT INTO api_configs (name, description, api_key, base_url, model, embedding_model, embedding_base_url, embedding_api_key, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [c.name, c.description || '', c.api_key, c.base_url, c.model, c.embedding_model || null, c.embedding_base_url || '', c.embedding_api_key || '', c.is_active || 0]
                );
            }
            console.log(`[DB] Restored ${savedConfigs.length} api configs`);
        } catch (e: any) {
            console.log('[DB] Failed to restore api configs:', e.message);
        }
    }
    console.log('[DB] Database reset complete');
}

async function initTables(database: SQLite.SQLiteDatabase): Promise<void> {
    await database.execAsync(CREATE_TABLES);
}

export async function closeDatabase(): Promise<void> {
    if (db) { await db.closeAsync(); db = null; }
}

export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await getDatabase();
    return database.getAllAsync<T>(sql, params);
}

export async function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
    const database = await getDatabase();
    return database.getFirstAsync<T>(sql, params);
}

export async function execute(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
    const database = await getDatabase();
    return database.runAsync(sql, params);
}

export async function withTransaction(fn: () => Promise<void>): Promise<void> {
    const database = await getDatabase();
    await database.withTransactionAsync(fn);
}
