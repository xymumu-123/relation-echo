import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum } from 'd3-force';
import { GraphNode, GraphEdge } from './graph-data';

export interface LayoutNode extends GraphNode, SimulationNodeDatum {}

const WIDTH = 360;
const HEIGHT = 500;

export function layoutGraph(nodes: GraphNode[], edges: GraphEdge[]): LayoutNode[] {
    if (nodes.length === 0) return [];

    const layoutNodes: LayoutNode[] = nodes.map(n => ({
        ...n,
        x: WIDTH / 2 + (Math.random() - 0.5) * 200,
        y: HEIGHT / 2 + (Math.random() - 0.5) * 200,
    }));

    const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));
    const links = edges
        .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
        .map(e => ({ source: e.source, target: e.target }));

    const simulation = forceSimulation(layoutNodes)
        .force('link', forceLink(links).id((d: any) => d.id).distance(80))
        .force('charge', forceManyBody().strength(-120))
        .force('center', forceCenter(WIDTH / 2, HEIGHT / 2))
        .force('collide', forceCollide().radius((d: any) => 12 + d.weight * 16))
        .stop();

    // Run synchronously
    for (let i = 0; i < 120; i++) simulation.tick();

    // Clamp to bounds
    for (const node of layoutNodes) {
        node.x = Math.max(20, Math.min(WIDTH - 20, node.x!));
        node.y = Math.max(20, Math.min(HEIGHT - 20, node.y!));
    }

    return layoutNodes;
}
