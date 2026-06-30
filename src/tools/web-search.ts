import axios from 'axios';
import { Tool, ToolResult, toolRegistry } from './tool-registry';

const webSearchTool: Tool = {
    name: 'web_search', description: '搜索引擎查询', parameters: { query: { type: 'string', description: '搜索关键词' } }, isSafe: true,
    async execute(params): Promise<ToolResult> {
        const { query } = params;
        try {
            const response = await axios.get('https://lite.duckduckgo.com/lite/', { params: { q: query }, timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Echo/1.0)' } });
            const html = response.data as string;
            const results: string[] = [];
            const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
            let match;
            while ((match = snippetRegex.exec(html)) && results.length < 5) { const text = match[1].replace(/<[^>]+>/g, '').trim(); if (text) results.push(text); }
            return { success: true, data: results.length > 0 ? results.join('\n\n') : `未找到关于"${query}"的结果` };
        } catch (error: any) { return { success: false, error: `搜索失败: ${error.message}` }; }
    },
};
toolRegistry.register(webSearchTool);
