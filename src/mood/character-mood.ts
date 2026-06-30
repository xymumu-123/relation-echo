import { execute, queryOne } from '../database/db';
import { CharacterMood } from '../database/schema';

interface MoodInfo {
    mood: string;
    trigger: string;
    responseStyle: string;
}

const MOOD_RESPONSE_MAP: Record<string, MoodInfo> = {
    happy: { mood: 'happy', trigger: '用户开心，角色也开心（共鸣）', responseStyle: '语气欢快、积极，和用户一起开心' },
    sad: { mood: 'gentle', trigger: '用户难过，角色温柔关心', responseStyle: '语气温柔、体贴，多倾听，少说教' },
    angry: { mood: 'calm', trigger: '用户愤怒，角色冷静理解', responseStyle: '语气平和、理解，不激化情绪' },
    anxious: { mood: 'concerned', trigger: '用户焦虑，角色安慰支持', responseStyle: '语气安慰、支持，给予安全感' },
    excited: { mood: 'excited', trigger: '用户兴奋，角色也兴奋', responseStyle: '语气热情、有活力，和用户一起兴奋' },
};

const MOOD_NAMES: Record<string, string> = {
    happy: '开心',
    gentle: '温柔',
    calm: '冷静',
    concerned: '关心',
    excited: '兴奋',
};

class CharacterMoodEngine {
    async getCurrentMood(characterId: number): Promise<CharacterMood | null> {
        const mood = await queryOne<CharacterMood>('SELECT * FROM character_moods WHERE character_id = ? ORDER BY id DESC LIMIT 1', [characterId]);
        if (mood && mood.affected_turns <= 0) return null;
        return mood;
    }

    // 获取丰富的情绪信息（用于 context 注入）
    async getMoodInfo(characterId: number): Promise<{ mood: CharacterMood; info: MoodInfo } | null> {
        const mood = await this.getCurrentMood(characterId);
        if (!mood) return null;
        const info = MOOD_RESPONSE_MAP[mood.mood] || { mood: mood.mood, trigger: mood.trigger || '', responseStyle: '' };
        return { mood, info };
    }

    async respondToUserEmotion(characterId: number, userEmotion: string): Promise<void> {
        const response = MOOD_RESPONSE_MAP[userEmotion];
        if (!response) return;
        await execute('INSERT INTO character_moods (character_id, mood, intensity, trigger, affected_turns) VALUES (?, ?, ?, ?, ?)', [characterId, response.mood, 0.7, response.trigger, 3]);
    }

    async tickMood(characterId: number): Promise<void> {
        const mood = await this.getCurrentMood(characterId);
        if (!mood) return;
        if (mood.affected_turns <= 1) await execute('DELETE FROM character_moods WHERE id = ?', [mood.id]);
        else await execute('UPDATE character_moods SET affected_turns = affected_turns - 1 WHERE id = ?', [mood.id]);
    }

    getMoodName(mood: string): string {
        return MOOD_NAMES[mood] || mood;
    }

    analyzeUserEmotion(message: string): string | null {
        if (/开心|高兴|快乐|兴奋|太好了|棒|赞/.test(message)) return 'happy';
        if (/难过|伤心|哭|痛苦|失落|沮丧/.test(message)) return 'sad';
        if (/生气|愤怒|烦|讨厌|气死/.test(message)) return 'angry';
        if (/焦虑|担心|害怕|紧张|不安/.test(message)) return 'anxious';
        if (/激动|兴奋|期待|迫不及待/.test(message)) return 'excited';
        return null;
    }
}

export const characterMoodEngine = new CharacterMoodEngine();
