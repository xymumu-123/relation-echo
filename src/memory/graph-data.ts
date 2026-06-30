import { query } from '../database/db';

export interface GraphNode {
    id: string;
    content: string;
    weight: number;
    nature: string[];
    x?: number;
    y?: number;
}

export interface GraphEdge {
    source: string;
    target: string;
    sharedTags: string[];
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

const MAX_NODES = 100;

export async function buildGraphData(characterId?: number): Promise<GraphData> {
    const conditions = ['status = \'active\''];
    const params: any[] = [];
    if (characterId) { conditions.push('character_id = ?'); params.push(characterId); }
    params.push(MAX_NODES);

    const rows = await query<any>(
        `SELECT * FROM memory_nodes WHERE ${conditions.join(' AND ')} ORDER BY weight DESC LIMIT ?`,
        params
    );

    const nodes: GraphNode[] = rows.map((r: any) => {
        const tags = JSON.parse(r.tags || '{"factual":[],"nature":[]}');
        return {
            id: r.id,
            content: r.content.length > 40 ? r.content.substring(0, 40) + '...' : r.content,
            weight: r.weight || 0.5,
            nature: tags.nature || [],
        };
    });

    if (nodes.length === 0) return { nodes: [], edges: [] };

    const nodeIds = new Set(nodes.map(n => n.id));
    const placeholders = nodes.map(() => '?').join(',');
    const tagRows = await query<any>(
        `SELECT memory_id, tag_name FROM tags WHERE memory_id IN (${placeholders}) AND tag_type = 'factual'`,
        nodes.map(n => n.id)
    );

    // Group tags by memory_id
    const tagMap = new Map<string, Set<string>>();
    for (const row of tagRows) {
        if (!tagMap.has(row.memory_id)) tagMap.set(row.memory_id, new Set());
        tagMap.get(row.memory_id)!.add(row.tag_name);
    }

    // Build edges from shared factual tags
    const edges: GraphEdge[] = [];
    const edgeKey = new Set<string>();
    const nodeArr = Array.from(tagMap.entries());

    for (let i = 0; i < nodeArr.length; i++) {
        for (let j = i + 1; j < nodeArr.length; j++) {
            const [idA, tagsA] = nodeArr[i];
            const [idB, tagsB] = nodeArr[j];
            if (!nodeIds.has(idA) || !nodeIds.has(idB)) continue;

            const shared: string[] = [];
            for (const tag of tagsA) {
                if (tagsB.has(tag)) shared.push(tag);
            }

            if (shared.length > 0) {
                const key = [idA, idB].sort().join('|');
                if (!edgeKey.has(key)) {
                    edgeKey.add(key);
                    edges.push({ source: idA, target: idB, sharedTags: shared });
                }
            }
        }
    }

    return { nodes, edges };
}
