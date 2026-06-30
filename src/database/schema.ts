// Echo 数据库表结构定义
export const DB_NAME = 'echo.db';
export const DB_VERSION = 6;

export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    title TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    replied_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE TABLE IF NOT EXISTS session_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    summary TEXT NOT NULL,
    message_range TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE TABLE IF NOT EXISTS memory_nodes (
    id TEXT PRIMARY KEY,
    session_id INTEGER,
    character_id INTEGER,
    content TEXT NOT NULL,
    tags TEXT,
    weight REAL DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_accessed TEXT,
    event_time TEXT,
    time_context TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
CREATE TABLE IF NOT EXISTS memory_vectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id TEXT NOT NULL UNIQUE,
    vector TEXT NOT NULL,
    model TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (memory_id) REFERENCES memory_nodes(id)
);
CREATE TABLE IF NOT EXISTS memory_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES memory_nodes(id),
    FOREIGN KEY (target_id) REFERENCES memory_nodes(id),
    UNIQUE(source_id, target_id)
);
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_id TEXT,
    tag_name TEXT NOT NULL,
    tag_type TEXT NOT NULL DEFAULT 'factual',
    FOREIGN KEY (memory_id) REFERENCES memory_nodes(id)
);
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
CREATE TABLE IF NOT EXISTS profile_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (profile_id) REFERENCES user_profiles(id)
);
CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    level INTEGER DEFAULT 0,
    intimacy REAL DEFAULT 0.0,
    trust REAL DEFAULT 0.0,
    call_name TEXT,
    total_interactions INTEGER DEFAULT 0,
    last_interaction TEXT,
    level_up_at TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
CREATE TABLE IF NOT EXISTS character_moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    mood TEXT NOT NULL,
    intensity REAL DEFAULT 0.5,
    trigger TEXT,
    affected_turns INTEGER DEFAULT 0,
    started_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
CREATE TABLE IF NOT EXISTS api_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model TEXT NOT NULL,
    embedding_model TEXT,
    embedding_base_url TEXT DEFAULT '',
    embedding_api_key TEXT DEFAULT '',
    input_price REAL DEFAULT 0,
    output_price REAL DEFAULT 0,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tool_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL UNIQUE,
    is_enabled INTEGER DEFAULT 1,
    config TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    embedding_tokens INTEGER,
    cost_estimate REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 索引：高频查询列
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
`;

export interface Character { id?: number; name: string; data: string; is_active?: number; created_at?: string; updated_at?: string; }
export interface Session { id?: number; character_id?: number; title?: string; created_at?: string; updated_at?: string; }
export interface Message { id?: number; session_id?: number; role: 'user' | 'assistant'; content: string; sent_at: string; replied_at?: string; created_at?: string; }
export interface SessionSummary { id?: number; session_id?: number; summary: string; message_range?: string; created_at?: string; }
export interface MemoryNode { id: string; session_id?: number; character_id?: number; content: string; tags: { factual: string[]; nature: string[]; source?: 'user' | 'ai' | 'cross' }; weight: number; access_count: number; status: 'active' | 'fading' | 'archived'; created_at?: string; updated_at?: string; last_accessed?: string; event_time?: string; time_context?: string; }
export interface MemoryVector { id?: number; memory_id: string; vector: number[]; model: string; dimension: number; created_at?: string; }
export interface UserProfile { id?: number; character_id?: number; data: string; updated_at?: string; }
export interface Relationship { id?: number; character_id?: number; level: number; intimacy: number; trust: number; call_name?: string; total_interactions: number; last_interaction?: string; level_up_at?: string; updated_at?: string; }
export interface CharacterMood { id?: number; character_id?: number; mood: string; intensity: number; trigger?: string; affected_turns: number; started_at?: string; }
export interface ApiConfig { id?: number; name: string; description?: string; api_key: string; base_url: string; model: string; embedding_model?: string; embedding_base_url?: string; embedding_api_key?: string; input_price?: number; output_price?: number; is_active?: number; created_at?: string; }
export interface TokenUsage { id?: number; session_id?: number; prompt_tokens: number; completion_tokens: number; embedding_tokens: number; cost_estimate?: number; created_at?: string; }
