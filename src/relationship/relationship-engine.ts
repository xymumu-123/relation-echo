import { execute, queryOne } from '../database/db';
import { Relationship } from '../database/schema';

const LEVEL_NAMES = ['陌生', '熟悉', '信任', '亲密', '挚友'];
const LEVEL_BEHAVIORS = [
    '保持礼貌距离，语气正式、温和。称呼用户为"你"。',
    '开始熟悉用户，可以稍微放松，偶尔主动关心。称呼用户为"你"。',
    '信任用户，可以聊深入话题，表达真实想法和感受。可以用昵称称呼用户。',
    '与用户关系亲密，语气自然、温暖，主动分享心情，边界适当放宽。',
    '与用户无话不谈，深度共情，语气亲密自然，像老朋友一样。',
];

class RelationshipEngine {
    private levelThresholds = [0, 10, 50, 100, 200];

    async getOrCreate(characterId: number, initialLevel?: number): Promise<Relationship> {
        let rel = await queryOne<Relationship>('SELECT * FROM relationships WHERE character_id = ?', [characterId]);
        if (!rel) {
            const level = initialLevel ?? 0;
            const initIntimacy = level * 0.15;
            const initTrust = level * 0.12;
            await execute('INSERT INTO relationships (character_id, level, intimacy, trust, total_interactions) VALUES (?, ?, ?, ?, 0)', [characterId, level, initIntimacy, initTrust]);
            rel = await queryOne<Relationship>('SELECT * FROM relationships WHERE character_id = ?', [characterId]);
        }
        return rel!;
    }

    /** 根据角色关系描述推断初始等级 */
    getInitialLevel(relationshipToUser: string): number {
        const r = relationshipToUser.toLowerCase();
        if (/青梅竹马|发小|从小一起|老朋友|多年好友/.test(r)) return 3;
        if (/最好的朋友|闺蜜|死党|挚友|知己/.test(r)) return 2;
        if (/伴侣|恋人|情侣|对象|男女朋友|老公|老婆/.test(r)) return 3;
        if (/朋友|好友|同学|同事/.test(r)) return 1;
        if (/家人|兄妹|姐弟|亲人/.test(r)) return 2;
        return 0;
    }

    async recordInteraction(characterId: number): Promise<Relationship> {
        const rel = await this.getOrCreate(characterId);
        const newTotal = rel.total_interactions + 1;
        const now = new Date().toISOString();
        const newIntimacy = Math.min(1.0, rel.intimacy + 0.01 + Math.random() * 0.02);
        const newTrust = Math.min(1.0, rel.trust + 0.005 + Math.random() * 0.01);
        let newLevel = rel.level;
        let levelUpAt = rel.level_up_at;
        let levelUp = false;
        if (rel.level < 4 && newTotal >= this.levelThresholds[rel.level + 1]) {
            newLevel = rel.level + 1;
            levelUpAt = now;
            levelUp = true;
        }
        const callName = this.getCallName(newLevel, rel.call_name);
        await execute('UPDATE relationships SET level = ?, intimacy = ?, trust = ?, call_name = ?, total_interactions = ?, last_interaction = ?, level_up_at = ?, updated_at = datetime(\'now\') WHERE character_id = ?', [newLevel, newIntimacy, newTrust, callName, newTotal, now, levelUpAt, characterId]);
        const updated = await this.getOrCreate(characterId);
        (updated as any)._levelUp = levelUp;
        return updated;
    }

    private getCallName(level: number, currentCallName?: string | null): string {
        if (level === 0) return '你';
        if (level === 1) return '你';
        if (level >= 2 && currentCallName && currentCallName !== '你') return currentCallName;
        return '你';
    }

    getBehaviorParams(rel: Relationship) {
        return {
            proactivity: 0.1 + (rel.level * 0.15),
            boundaryFlexibility: 0.2 + (rel.level * 0.15),
        };
    }

    getLevelName(level: number): string {
        return LEVEL_NAMES[level] || '陌生';
    }

    getLevelBehavior(level: number): string {
        return LEVEL_BEHAVIORS[level] || LEVEL_BEHAVIORS[0];
    }
}

export const relationshipEngine = new RelationshipEngine();
