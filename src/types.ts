export interface Dream {
  id: string;
  createdAt: number;
  originalText: string;
  dreamTitle: string;
  coreImagery: string[];  // 保留向后兼容
  tags: string[];         // 新版 tags
  story: StoryNode[];
  analysis?: DreamAnalysis;
  versions?: DreamVersion[];
  currentVersionId?: string;
}

export interface DreamVersion {
  versionId: string;
  versionName: string;
  versionType: 'original' | 'continued' | 'rewritten' | 'branch';
  story: StoryNode[];
  createdAt: number;
  parentVersionId?: string;
  branchPoint?: number; // index in story where branch happened
}

export type EndingType = 'warm' | 'suspense' | 'poetic' | 'custom';

export interface StoryNode {
  nodeId: number;
  nodeType: '开场' | '怪诞' | '转场' | '抉择行动' | '结局';
  narrativeText: string;
  decisionAnchor: string | null;
  sceneDescription: string;  // 中文场景详细描述
  visualPrompt: string;       // 英文 Stable Diffusion 提示词
  imageUrl: string;
}

export interface ProcessedDreamResult {
  dream_title: string;
  tags: string[];
  story_nodes: Array<{
    node_id: number;
    node_type: '开场' | '怪诞' | '转场' | '抉择行动' | '结局';
    narrative_text: string;
    decision_anchor: string | null;
    scene_description: string;   // 中文场景详细描述
    visual_prompt: string;        // 英文 Stable Diffusion 提示词
  }>;
}

export interface CreateDreamInput {
  originalText: string;
}

// 做梦者基底数据
export interface DreamerBase {
  age?: number;
  gender?: string;
  mbti?: string;
  socialRole?: 'student' | 'worker' | 'freelance' | 'gap';
  energyLevel?: 'full' | 'tired' | 'draining' | 'broken';
}

// 潜意识刺点侦探相关
export interface SubconsciousQuestion {
  target_name: string;
  target_type: 'character' | 'object';
  question_text: string;
  quick_tags: string[];
}

export interface PainPointResult {
  identified_targets: string[];
  questions: SubconsciousQuestion[];
}

// 用户回答
export interface QuestionAnswer {
  questionIndex: number;
  textAnswer?: string;
  selectedTag?: string;
}

// 赛博判官最终分析结果
export interface CyberAnalysisResult {
  title_tag: string;
  cyber_diagnosis: string;
  symbols_decoded: Array<{symbol: string, meaning: string}>;
  master_review: string;
  electronic_ibuprofen: string;
}

// 兼容旧版分析（保留向后兼容）
export interface DreamAnalysis {
  vibe_tag: string;
  reality_mirror: string;
  symbols_decoded: Array<{
    symbol: string;
    meaning: string;
  }>;
  soul_message: string;
  actionable_advice: string;
  // 新版字段
  cyberAnalysis?: CyberAnalysisResult;
}

export type EmotionTag = '疲惫' | '焦虑' | '期待' | '平静' | '心碎' | '破防';

// Branch feature interfaces
export interface BranchDecisionPoint {
  highlight_text: string;
  branch_options: string[];
  story_index: number;
}

export interface ForkPointResult {
  highlight_text: string;
  branch_options: string[];
}

export interface MultiverseResult {
  branch_nodes: Array<{
    node_id: number;
    narrative_text: string;
    visual_keywords: string;
  }>;
}
