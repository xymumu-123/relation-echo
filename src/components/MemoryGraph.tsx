import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { GraphData, GraphEdge } from '../memory/graph-data';
import { layoutGraph, LayoutNode } from '../memory/graph-layout';

interface Props {
    data: GraphData;
    width?: number;
    height?: number;
}

const NATURE_COLORS: Record<string, string> = {
    '事实信息': '#4CAF50',
    '个人偏好': '#FF9800',
    '事件经历': '#2196F3',
    '情绪感受': '#E91E63',
    '知识技能': '#9C27B0',
    '人际动态': '#00BCD4',
    '目标计划': '#FF5722',
};

function getNodeColor(nature: string[]): string {
    if (nature.length === 0) return '#6C63FF';
    return NATURE_COLORS[nature[0]] || '#6C63FF';
}

export default function MemoryGraph({ data, width = 360, height = 500 }: Props) {
    const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);

    const layoutNodes = useMemo(() => layoutGraph(data.nodes, data.edges), [data]);
    const nodeMap = useMemo(() => new Map(layoutNodes.map(n => [n.id, n])), [layoutNodes]);

    const edges = useMemo(() => {
        return data.edges
            .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
            .map(e => ({
                ...e,
                x1: nodeMap.get(e.source)!.x!,
                y1: nodeMap.get(e.source)!.y!,
                x2: nodeMap.get(e.target)!.x!,
                y2: nodeMap.get(e.target)!.y!,
            }));
    }, [data.edges, nodeMap]);

    if (layoutNodes.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>还没有记忆数据</Text>
            </View>
        );
    }

    return (
        <View>
            <Svg width={width} height={height}>
                {/* Edges */}
                {edges.map((edge, i) => (
                    <Line
                        key={`e-${i}`}
                        x1={edge.x1}
                        y1={edge.y1}
                        x2={edge.x2}
                        y2={edge.y2}
                        stroke="#ddd"
                        strokeWidth={1}
                        strokeDasharray="4,2"
                    />
                ))}

                {/* Nodes */}
                {layoutNodes.map(node => {
                    const r = 6 + node.weight * 12;
                    const color = getNodeColor(node.nature);
                    const isSelected = selectedNode?.id === node.id;
                    return (
                        <G key={node.id} onPress={() => setSelectedNode(isSelected ? null : node)}>
                            <Circle
                                cx={node.x}
                                cy={node.y}
                                r={isSelected ? r + 3 : r}
                                fill={color}
                                opacity={isSelected ? 1 : 0.8}
                                stroke={isSelected ? '#333' : 'none'}
                                strokeWidth={isSelected ? 2 : 0}
                            />
                            {r > 10 && (
                                <SvgText
                                    x={node.x}
                                    y={node.y! + r + 12}
                                    fontSize={9}
                                    fill="#666"
                                    textAnchor="middle"
                                >
                                    {node.content.substring(0, 8)}
                                </SvgText>
                            )}
                        </G>
                    );
                })}
            </Svg>

            {/* Selected node detail */}
            {selectedNode && (
                <View style={styles.detail}>
                    <Text style={styles.detailContent}>{selectedNode.content}</Text>
                    <View style={styles.detailMeta}>
                        <Text style={styles.detailWeight}>权重: {(selectedNode.weight * 100).toFixed(0)}%</Text>
                        {selectedNode.nature.map(n => (
                            <Text key={n} style={[styles.detailTag, { backgroundColor: NATURE_COLORS[n] || '#999' }]}>{n}</Text>
                        ))}
                    </View>
                </View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
                {Object.entries(NATURE_COLORS).map(([name, color]) => (
                    <View key={name} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: color }]} />
                        <Text style={styles.legendText}>{name}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    empty: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: '#999' },
    detail: { backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    detailContent: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 8 },
    detailMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    detailWeight: { fontSize: 12, color: '#6C63FF', fontWeight: 'bold' },
    detailTag: { fontSize: 10, color: '#fff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 10, color: '#666' },
});
