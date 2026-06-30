export interface Tool { name: string; description: string; parameters: Record<string, any>; execute(params: Record<string, any>): Promise<ToolResult>; isSafe?: boolean; needsConfirmation?: boolean; }
export interface ToolResult { success: boolean; data?: string; error?: string; }

class ToolRegistry {
    private tools = new Map<string, Tool>();
    register(tool: Tool): void { this.tools.set(tool.name, tool); }
    getTool(name: string): Tool | undefined { return this.tools.get(name); }
    getAllTools(): Tool[] { return Array.from(this.tools.values()); }
    getSafeTools(): Tool[] { return this.getAllTools().filter(t => t.isSafe !== false); }
    async execute(name: string, params: Record<string, any>): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) return { success: false, error: `Tool '${name}' not found` };
        try { return await tool.execute(params); } catch (error: any) { return { success: false, error: error.message }; }
    }
}

export const toolRegistry = new ToolRegistry();
