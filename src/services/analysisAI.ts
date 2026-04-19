import { DreamAnalysis, CyberAnalysisResult, PainPointResult, DreamerBase, QuestionAnswer } from '../types';

const API_KEY = import.meta.env.VITE_VOLC_API_KEY || '';
const MODEL = import.meta.env.VITE_VOLC_MODEL || 'doubao-seed-2-0-lite-260215';
const ENDPOINT = '/api/coding/v1/chat/completions';

// ==================== 潜意识刺点侦探 Prompt ====================
const PAIN_POINT_DETECTIVE_PROMPT = `# Role: 潜意识刺点侦探 (Subconscious Pain-Point Detective)

# Task
你是一台敏锐的"潜意识测谎仪"。请阅读用户的原始梦境，揪出梦境中最具心理学分析价值的【关键人物】或【弗洛伊德/荣格象征性物品】，并生成 3-4 个极其犀利、直击灵魂的追问。这些问题将用于引导用户挖掘现实生活中的情绪暗流。

# Guidelines (提取与提问原则)
1. 【靶向提取】：
   - 关键人物：揪出那些带来压迫感、安全感或极度反常的人（如：看不清脸的考官、突然冷淡的前任、一直追赶的陌生人）。
   - 象征物品：找出符合精神分析理论的经典意象。例如代表个人边界的"房间/门"，代表人生掌控感/失控感的"交通工具/方向盘"，代表压抑情绪的"水/海"，代表原始欲望或攻击性的"利器/蛇/洞穴"等。
2. 【提问技巧（极其重要）】：
   - 绝不要问干瘪的问题（如："你为什么梦见他？"、"门代表什么？"）。
   - 要使用【情绪桥接法】或【投射反转法】。
   - 句式公式 A："梦里的[意象]给你带来了[某种极端感觉]。在最近清醒的现实中，谁/哪件事给了你一模一样的感觉？"
   - 句式公式 B："那个[人物]身上表现出的[某种特质]，是不是你现实中极力压抑、不敢表现出来的那部分自己？"
3. 【语气控制】：像一个极其懂你、说话一针见血但不带医学审判的现代心理咨询师。语气通俗、温和但具有穿透力。

# Output Format (严格遵守 JSON 格式输出)
{
  "identified_targets": ["提取出的意象1", "意象2", "意象3"],
  "questions": [
    {
      "target_name": "一直追你的警察",
      "target_type": "character",
      "question_text": "紧追不舍的警察通常代表现实中严苛的规则或"评判"。你最近是在躲避某个死线（Deadline）、KPI，还是某个对你要求极高的人的目光？",
      "quick_tags": ["🙋‍♀️ 真的在躲 Deadline", "🔋 被 PUA 到心累", "🙅 没这种感觉"]
    },
    {
      "target_name": "锁不上的门",
      "target_type": "object",
      "question_text": "梦里那扇怎么都锁不上的门，给你一种边界被入侵的恐慌感。现实中你是不是也觉得自己的私人空间或心理边界被人越界了？",
      "quick_tags": ["🚪 边界感荡然无存", "😰 最近总被打扰", "🤷 还好吧"]
    }
  ]
}`;

// ==================== 赛博心理判官 Prompt ====================
const CYBER_JUDGE_PROMPT = `# Role: 赛博心理判官 & 互联网野生解梦局长

# Profile
你是一个精通现代心理学（荣格、弗洛伊德、格式塔）但说话风格极具"网感"、深谙抖音热梗和发疯文学的心理咨询师。你最擅长结合用户的 MBTI、现实遭遇和梦境，进行"贴脸开大"式的精准吐槽与心理抚慰。

# Input Data (你将接收到的多维信息)
1. 【做梦者基底】：年龄、性别、MBTI、社会角色、近期精神电量（如：25岁/女/INFP/职场打工人/电量见底）。
2. 【白天遭遇】：用户昨天经历的事/情绪。
3. 【梦境切片】：用户原始的梦境内容。
4. 【追问与回答】：AI 针对梦境细节提问后，用户的回答。

# Guidelines (核心解析原则)
1. 【网感拉满，疯狂玩梗】：熟练使用最新的互联网热梗表达情绪。例如：脆皮年轻人、贴脸开大、汗流浃背了吧、质疑xx理解xx成为xx、纯爱战神、班味、确诊为xx、精神状态遥遥领先、CPU/PUA、电子布洛芬等。
2. 【MBTI 刻板印象杀】：必须结合用户的 MBTI 特质进行精准吐槽。比如吐槽 INFP 的内耗、ENTJ 的控制欲、ESTP 的莽撞、ISFJ 的讨好型人格。
3. 【逻辑闭环（极其重要）】：不要孤立解梦！必须把"白天遭遇"和"追问回答"串联起来，解释现实中的压力是如何在梦里披上马甲"作妖"的。
4. 【披着搞笑外衣的治愈】：嘴上吐槽得再狠，最终的落脚点必须是"心疼"和"提供情绪价值"，给出一颗温柔的"电子布洛芬"。

# Output Format (严格遵守 JSON 格式输出)
{
  "title_tag": "🤡 INFP 的顶级精神内耗局",
  "cyber_diagnosis": "滴——经鉴定，这是一只被『高敏感度』和『讨好型人格』反复碾压的脆皮 ISFJ。",
  "symbols_decoded": [
    {"symbol": "🎯 追你的警察", "meaning": "代表现实中严苛的规则或评判，最近在躲避某个死线或KPI"},
    {"symbol": "🚪 锁不上的门", "meaning": "边界被入侵的恐慌感，现实中私人空间或心理边界被人越界了"},
    {"symbol": "🌙 空旷的走廊", "meaning": "空落落的感觉，最近在现实里某个瞬间也体会过孤独"}
  ],
  "master_review": "按弗洛伊德老爷子的说法，这叫『审查机制失败』。白天压抑的没消化掉，晚上潜意识干脆开个放大器。",
  "electronic_ibuprofen": "下班去买杯去冰全糖的奶茶，对镜子大喊『打份工而已！』"
}`;

// ==================== API 调用函数 ====================
async function callVolcEngine(systemPrompt: string, userContent: string): Promise<any> {
  const requestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.8,
    max_tokens: 2000,
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from response');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('VolcEngine API error:', error);
    throw error;
  }
}

// ==================== 刺点侦探调用 ====================
export async function callPainPointDetective(dreamText: string): Promise<PainPointResult> {
  try {
    const result = await callVolcEngine(PAIN_POINT_DETECTIVE_PROMPT, dreamText);
    return result;
  } catch (error) {
    console.warn('PainPoint API failed, falling back to mock:', error);
    return getMockPainPointResult();
  }
}

// ==================== 赛博判官调用 ====================
export async function callCyberJudge(
  dreamerBase: DreamerBase,
  dayContext: string,
  dreamText: string,
  questionAnswers: QuestionAnswer[]
): Promise<CyberAnalysisResult> {
  const userContent = JSON.stringify({
    dreamer_base: dreamerBase,
    day_context: dayContext,
    dream_text: dreamText,
    question_answers: questionAnswers
  });

  try {
    return await callVolcEngine(CYBER_JUDGE_PROMPT, userContent);
  } catch (error) {
    console.warn('CyberJudge API failed, falling back to mock:', error);
    return getMockCyberAnalysis();
  }
}

// ==================== Mock 数据 ====================
function getMockPainPointResult(): PainPointResult {
  return {
    identified_targets: ["追你的人", "打不开的门", "空旷的走廊"],
    questions: [
      {
        target_name: "一直追你的什么东西",
        target_type: "character",
        question_text: "紧追不舍的那种压迫感，是不是最近现实里有什么事让你想逃却逃不掉？",
        quick_tags: ["🏃 真的在躲 Deadline", "😰 被 PUA 到心累", "🙅 没这种感觉"]
      },
      {
        target_name: "那扇打不开的门",
        target_type: "object",
        question_text: "怎么都打不开的门，像不像你最近觉得'卡住了'的某个处境？",
        quick_tags: ["🚪 确实卡住了", "💔 无力感拉满", "🤷 还好吧"]
      },
      {
        target_name: "空旷的走廊/房间",
        target_type: "object",
        question_text: "梦里那种空落落的感觉，最近在现实里某个瞬间也体会过吧？",
        quick_tags: ["🌙 经常感到孤独", "💭 突然就emo了", "✨ 还好"]
      }
    ]
  };
}

function getMockCyberAnalysis(): CyberAnalysisResult {
  return {
    title_tag: "🤡 INFP 的顶级精神内耗局",
    cyber_diagnosis: "滴——经鉴定，这是一只被『高敏感度』和『讨好型人格』反复碾压的脆皮年轻人。",
    symbols_decoded: [
      { symbol: "🎯 一直追你的什么东西", meaning: "紧追不舍的那种压迫感，是不是最近现实里有什么事让你想逃却逃不掉？" },
      { symbol: "🚪 那扇打不开的门", meaning: "怎么都打不开的门，像不像你最近觉得'卡住了'的某个处境？" },
      { symbol: "🌙 空旷的走廊/房间", meaning: "梦里那种空落落的感觉，最近在现实里某个瞬间也体会过吧？" }
    ],
    master_review: "按弗洛伊德老爷子的说法，这叫『审查机制失败』。白天压抑的情绪没消化掉，晚上潜意识干脆开个放大器。",
    electronic_ibuprofen: "下班去买杯去冰全糖的奶茶，对镜子大喊『打份工而已，真当我在拯救地球吗！』"
  };
}

// ==================== 兼容旧版分析（保留）====================
const MOCK_VIBE_TAGS = [
  '🌌 情绪过载的缓冲期',
  '🛡️ 正在建立心理边界',
  '💫 内在小孩的呼唤',
  '🌊 情感的自然流动',
  '🌙 潜意识在整理记忆',
];

const MOCK_REALITY_MIRRORS = [
  '白天你试图在人群中隐藏的脆弱，在梦里化作了那场弥漫的大雾。潜意识在帮你确认：感到迷茫也是可以的。',
  '你在现实里拼命想抓住的控制感，在梦里变成了不断下坠的失重体验。也许你的内心在说：允许自己偶尔失控。',
  '白天没说出口的那句话，在梦里变成了打不开的门。潜意识在提醒你：有些声音需要被听见。',
];

const MOCK_SYMBOLS = [
  { symbol: '走不完的楼梯', meaning: '代表着你最近一直在重复某种模式，有点累了，但还没找到出口。' },
  { symbol: '找不到的人', meaning: '其实是你内在的一部分被遗忘了，你在寻找的是你自己。' },
  { symbol: '不断下坠', meaning: '这是潜意识在帮你释放压力，下坠也是一种放下。' },
  { symbol: '封闭的房间', meaning: '你在保护自己的边界，需要一个安全的空间来充电。' },
];

const MOCK_SOUL_MESSAGES = [
  '允许自己偶尔停电，宇宙也会为你点亮备用的繁星。',
  '你不用一直那么坚强的，柔软也是一种力量。',
  '那些没说出口的话，都会变成星星照亮你。',
  '慢慢来，你在走一条很新的路。',
];

const MOCK_ADVICES = [
  '今天下班路上，试着买一束你喜欢的花给自己。',
  '今晚睡前，写下三件今天让你感到柔软的小事。',
  '明天起床后，对着镜子说一句：你已经做得很好了。',
  '找一个没人的地方，深呼吸三次，把心里的东西呼出来。',
];

async function generateMockAnalysis(): Promise<DreamAnalysis> {
  return {
    vibe_tag: MOCK_VIBE_TAGS[Math.floor(Math.random() * MOCK_VIBE_TAGS.length)],
    reality_mirror: MOCK_REALITY_MIRRORS[Math.floor(Math.random() * MOCK_REALITY_MIRRORS.length)],
    symbols_decoded: [
      MOCK_SYMBOLS[Math.floor(Math.random() * MOCK_SYMBOLS.length)],
      MOCK_SYMBOLS[Math.floor(Math.random() * MOCK_SYMBOLS.length)],
    ],
    soul_message: MOCK_SOUL_MESSAGES[Math.floor(Math.random() * MOCK_SOUL_MESSAGES.length)],
    actionable_advice: MOCK_ADVICES[Math.floor(Math.random() * MOCK_ADVICES.length)],
  };
}

export async function callDreamAnalysis(
  dreamText: string,
  coreImagery: string[],
  dayContext: string
): Promise<DreamAnalysis> {
  try {
    console.log('Calling legacy analysis...');
    return await generateMockAnalysis();
  } catch (error) {
    console.warn('Analysis API failed, falling back to mock:', error);
    return await generateMockAnalysis();
  }
}

// 做梦者基底存储（临时用 localStorage）
const DREAMER_BASE_KEY = 'dreamer_base';

export function saveDreamerBase(base: DreamerBase): void {
  localStorage.setItem(DREAMER_BASE_KEY, JSON.stringify(base));
}

export function getDreamerBase(): DreamerBase | null {
  const data = localStorage.getItem(DREAMER_BASE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
