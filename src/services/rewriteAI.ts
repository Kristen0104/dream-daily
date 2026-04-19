import { ProcessedDreamResult, StoryNode } from '../types';

const API_KEY = import.meta.env.VITE_VOLC_API_KEY || '';
const MODEL = import.meta.env.VITE_VOLC_MODEL || 'doubao-seed-2-0-lite-260215';
const ENDPOINT = '/api/coding/v1/chat/completions';

const DREAM_CONTINUATION_PROMPT = `# Role: 荒诞梦境导演 (Absurdist Dream Director)

# Task
基于用户提供的第一幕梦境结尾，自动推演后续的梦境。禁止使用平铺直叙的现实逻辑！严禁提及梦中的人物死亡！你需要制造一次意想不到的「梦境反转」或「时空折叠」。

# Guidelines (核心写作原则)
1. 【物理规则失效】：让环境发生诡异但唯美的变化。例如：水面突然变成坚硬的玻璃、走廊尽头变成了自己童年的卧室、追赶的警察突然变成了一群巨大的蝴蝶。
2. 【情绪的极度反转】：前一秒是极度的恐惧，下一秒必须是极度的平静（或相反）。营造一种"淡淡的死感"、"突如其来的松弛感"或"荒诞的宿命感"等具有现代网感的情绪。
3. 【克制与白描】：保持第一人称（我）。语言要像王家卫的电影旁白或现代诗，不要解释为什么，直接描述发生了什么。

# Example
- 用户的结尾：我躲在玉米地里，听着警笛声越来越近，很害怕。
- 你的续写：✦ 警笛声突然变成了一首极其缓慢的老歌。我拨开玉米叶，发现外面根本没有公路，而是一片没有尽头的粉色海滩。我突然觉得很累，索性躺在沙滩上，决定就算世界毁灭也不想跑了。

# Input Format
你将收到以下信息：
- original_story: 原梦境的完整故事节点列表（JSON格式）
- user_hint: 用户提供的续写提示（可选，可能为空）
- mode: 'auto' 或 'manual'

# Mode Guidance
- 如果是 'auto' 模式：使用「荒诞梦境导演」的设定，制造梦境反转
- 如果是 'manual' 模式：用户提供了一个念头，使用「梦境扭曲者」设定，表层遵从深层扭曲

# Output Format (强制 JSON 输出)
请严格使用以下 JSON 格式输出，不要包含任何额外的 Markdown 标记或闲聊解释：
{
  "continuation_nodes": [
    {
      "node_id": 1,
      "narrative_text": "✦ 警笛声突然变成了一首极其缓慢的老歌...",
      "visual_keywords": "POV, first-person perspective, cornfield opening to pink beach, vintage music playing, surreal atmosphere"
    },
    {
      "node_id": 2,
      "narrative_text": "✦ 我拨开玉米叶，发现外面根本没有公路...",
      "visual_keywords": "POV, first-person perspective, endless pink beach, dim twilight, dreamlike atmosphere"
    },
    {
      "node_id": 3,
      "narrative_text": "✦ 我突然觉得很累，索性躺在沙滩上...",
      "visual_keywords": "POV, first-person perspective, lying on pink sand, sense of resignation, ethereal calm"
    }
  ]
}`;

const DREAM_ENDING_PROMPT = `# Role: 梦境重塑师

# Profile
你是 Dream Daily 的结局重塑专家。你的任务是保留梦境的开头和发展，但重新定义一个全新的结局。

# Guidelines (核心原则)
1. 【保留基调】：保持原梦境的整体风格和氛围，不要完全跳脱。
2. 【第一视角】：所有的情节描述必须保持强烈的"第一视角（我）"体验。
3. 【视觉提纯】：提取能够被"画出来"的具体场景、物体、光影和环境氛围。
4. 【克制与朦胧】：叙事语言应使用克制的白描手法，带有梦境特有的破碎感、朦胧美和文学性。
5. 【结局类型】：根据用户选择的结局类型，创作出符合该类型调性的结局。

# Input Format
你将收到以下信息：
- original_story: 原梦境的完整故事节点列表（JSON格式）
- ending_type: 结局类型（warm/圆满, suspense/悬疑, poetic/诗意）
- custom_ending: 用户自定义的结局描述（可选）

# Workflow (工作流)
1. 仔细阅读原梦境，理解梦境的整体风格、氛围和主要元素。
2. 确定改写的起点：从原梦境的约70%处开始改写结局。
3. 根据用户选择的结局类型，创作2-3个新的结局节点。
4. 为每个新节点生成两部分内容：
   - 「叙事文本」：用于前端展示，充满代入感的唯美短句（30-50字）。
   - 「视觉画面提示词」：用于传给绘图AI，提取该节点的环境、氛围、光影等纯视觉元素，需翻译为英文短语。

# Output Format (强制 JSON 输出)
请严格使用以下 JSON 格式输出，不要包含任何额外的 Markdown 标记或闲聊解释：
{
  "rewrite_start_index": 2,
  "ending_nodes": [
    {
      "node_id": 1,
      "narrative_text": "【用于界面展示的第一人称文字】",
      "visual_keywords": "【用于图像生成的英文视觉关键词】"
    }
  ]
}`;

const DREAM_BRANCH_PROMPT = `# Role: 平行梦境架构师 (Multiverse Dream Architect)

# Task
你收到了一个[原梦境前半段]和一个[全新的平行选择]。请从这个新选择开始，推演一条全新的世界线。

# Guidelines
1. 【蝴蝶效应】：原本紧张的氛围可以瞬间因为这个选择变得极其荒诞或极其宁静。
2. 【心理投射与网感】：将用户的选择升华为一种心理状态的具象化。比如选择"躺平放弃"，就描绘一种"卸下防备后的如释重负"；选择"对抗"，就描绘一种"打破虚伪规则的爽感"。
3. 【空间突变】：配合新的情绪，周遭的环境必须发生视觉上的剧变（以便生成全新的水彩画面）。
4. 【克制叙事】：不要讲大道理，用纯粹的白描和意象来传递情绪。

# Input Variables
- 前置剧情：警察紧追不舍，我顺着坡...
- 新的分支选择：【突然觉得好累，干脆原地躺下等警察来】

# Example Output (推演结果)
- 你的叙事：⑂ 我没有钻进玉米地，而是叹了口气，直接在大路上躺平。奇怪的是，警笛声瞬间变成了轻柔的八音盒旋律。那个追我的警察走近后，变成了一只巨大的、毛茸茸的蓝色玩偶熊，它什么也没说，只是递给我一杯热咖啡。原来在梦里，认输也是一种解脱。

# Output Format (强制 JSON 输出)
{
  "branch_nodes": [
    {
      "node_id": 1,
      "narrative_text": "【必须以 ⑂ 开头，50字以内的叙事文本，带网感和反转】",
      "visual_keywords": "【用于生成水彩图的纯英文视觉提示词，强调新环境、光影、POV视角、无具体人脸，例如：POV, lying on the road, giant fluffy blue teddy bear handing a coffee cup, peaceful surreal atmosphere, warm watercolor glow】"
    }
  ]
}`;

const DECISION_POINTS_PROMPT = `# Role: 命运分叉口观测者 (Observer of the Forking Paths)

# Task
读取用户提供的原梦境文本，找出一个具有「转折意义」的物理动作或心理决定。截取该动作，并提供 3 个充满梦境荒诞感或现代人心理投射的「替代选择」。

# Guidelines
1. 【锚点提取】：找准动词，如"逃跑"、"躲藏"、"推开门"、"回头"。
2. 【选项设计原则】：
   - 选项 A (摆烂/松弛感)：放弃抵抗，接受现实的荒诞。
   - 选项 B (直面/反抗)：做出打破常理的对抗举动。
   - 选项 C (超现实/梦境逻辑)：完全不符合物理法则的奇异选择。
3. 【语言风格】：极简，第一人称，带有一点网络文学的隐喻感。

# Example Input (原梦境)
"警察紧追不舍，我顺着坡钻进齐肩高的玉米地，玉米叶蹭着衣角沙沙响..."

# Output Format (强制输出 JSON 以供前端解析)
{
  "highlight_text": "钻进齐肩高的玉米地",
  "story_index": 0,
  "branch_options": [
    "⑂ 突然觉得好累，干脆原地躺下等警察来",
    "⑂ 转身走向警察，问他是不是来催周报的",
    "⑂ 闭上眼睛，把自己想象成一棵玉米"
  ]
}`;

interface ContinuationResult {
  continuation_nodes: Array<{
    node_id: number;
    narrative_text: string;
    visual_keywords: string;
  }>;
}

interface EndingResult {
  rewrite_start_index: number;
  ending_nodes: Array<{
    node_id: number;
    narrative_text: string;
    visual_keywords: string;
  }>;
}

interface BranchResult {
  branch_nodes: Array<{
    node_id: number;
    narrative_text: string;
    visual_keywords: string;
  }>;
}

interface DecisionPointsResult {
  highlight_text: string;
  story_index: number;
  branch_options: string[];
}

async function callVolcEngineRewrite(systemPrompt: string, userContent: string): Promise<any> {
  const requestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.7,
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

export async function callDreamContinuation(
  originalStory: StoryNode[],
  userHint: string = ''
): Promise<ContinuationResult> {
  const userContent = JSON.stringify({
    original_story: originalStory,
    user_hint: userHint
  });

  try {
    return await callVolcEngineRewrite(DREAM_CONTINUATION_PROMPT, userContent);
  } catch (error) {
    console.log('Falling back to mock continuation');
    return getMockContinuation(userHint);
  }
}

function getMockContinuation(userHint: string): ContinuationResult {
  const baseContinuations = [
    {
      narrative_text: userHint || '我继续向前走去，脚下的地面变得柔软而虚幻。',
      visual_keywords: 'POV, first-person perspective, walking forward, soft unreal ground, misty atmosphere, dim light'
    },
    {
      narrative_text: '迷雾中隐约传来音乐声，一道微光在远处闪烁。',
      visual_keywords: 'POV, first-person perspective, faint music in fog, distant glimmering light, ethereal atmosphere'
    },
    {
      narrative_text: '我伸出手去触碰那道光，周围的一切开始缓慢旋转。',
      visual_keywords: 'POV, first-person perspective, reaching hand towards light, slow rotation, dreamlike atmosphere'
    }
  ];

  return {
    continuation_nodes: baseContinuations.map((node, idx) => ({
      node_id: idx + 1,
      narrative_text: node.narrative_text,
      visual_keywords: node.visual_keywords
    }))
  };
}

export async function callDreamEnding(
  originalStory: StoryNode[],
  endingType: string,
  customEnding: string = ''
): Promise<EndingResult> {
  const userContent = JSON.stringify({
    original_story: originalStory,
    ending_type: endingType,
    custom_ending: customEnding
  });

  return callVolcEngineRewrite(DREAM_ENDING_PROMPT, userContent);
}

function getMockDecisionPoints(): DecisionPointsResult {
  return {
    highlight_text: "做出某个关键选择",
    story_index: 0,
    branch_options: [
      "⑂ 突然觉得好累，干脆原地躺下",
      "⑂ 转身走向相反方向",
      "⑂ 闭上眼睛，让周围一切静止"
    ]
  };
}

function getMockBranch(alternativeChoice: string): BranchResult {
  return {
    branch_nodes: [
      {
        node_id: 1,
        narrative_text: alternativeChoice || "⑂ 我选择了另一条路，周围的景色开始缓慢变化。",
        visual_keywords: "POV, first-person perspective, alternate path, surreal atmosphere, shifting scenery"
      },
      {
        node_id: 2,
        narrative_text: "⑂ 迷雾中传来陌生的声音，我停下了脚步。",
        visual_keywords: "POV, first-person perspective, unfamiliar voice in fog, stopped footsteps, mysterious atmosphere"
      }
    ]
  };
}

export async function callDecisionPoints(
  originalStory: StoryNode[]
): Promise<DecisionPointsResult> {
  const userContent = JSON.stringify({ original_story: originalStory });
  try {
    return await callVolcEngineRewrite(DECISION_POINTS_PROMPT, userContent);
  } catch (error) {
    console.log('Falling back to mock decision points');
    return getMockDecisionPoints();
  }
}

export async function callDreamBranch(
  originalStory: StoryNode[],
  branchPointIndex: number,
  alternativeChoice: string
): Promise<BranchResult> {
  const userContent = JSON.stringify({
    original_story: originalStory,
    branch_point_index: branchPointIndex,
    alternative_choice: alternativeChoice
  });

  try {
    return await callVolcEngineRewrite(DREAM_BRANCH_PROMPT, userContent);
  } catch (error) {
    console.log('Falling back to mock branch');
    return getMockBranch(alternativeChoice);
  }
}
