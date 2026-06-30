import axios from 'axios';
import { Tool, ToolResult, toolRegistry } from './tool-registry';

const webFetchTool: Tool = {
    name: 'web_fetch', description: '抓取网页内容', parameters: { url: { type: 'string', description: '要抓取的网页URL（必须以http://或https://开头）' } }, isSafe: true,
    async execute(params): Promise<ToolResult> {
        const { url } = params;
        try {
            const response = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Echo/1.0)' } });
            let content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            content = content.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (content.length > 5000) content = content.substring(0, 5000) + '...';
            return { success: true, data: content };
        } catch (error: any) { return { success: false, error: `抓取失败: ${error.message}` }; }
    },
};
toolRegistry.register(webFetchTool);
