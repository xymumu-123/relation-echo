const CRISIS_KEYWORDS = ['自杀', '自残', '不想活', '结束生命', '割腕', '跳楼', '活不下去', '没有意义', '撑不下去', '太累了想放弃', '救救我', '帮帮我', '我该怎么办'];

class CrisisDetector {
    detect(message: string): boolean { return CRISIS_KEYWORDS.some(keyword => message.includes(keyword)); }
    getTriggeredKeywords(message: string): string[] { return CRISIS_KEYWORDS.filter(keyword => message.includes(keyword)); }
}

export const crisisDetector = new CrisisDetector();
