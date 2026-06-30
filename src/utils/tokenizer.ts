export function estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w.length > 0).length;
    return chineseChars * 2 + englishWords;
}

export function estimateMessageTokens(messages: { role: string; content: string }[]): number {
    let total = 0;
    for (const msg of messages) { total += 4; total += estimateTokens(msg.content); }
    return total;
}
