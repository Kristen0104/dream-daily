import { DreamAnalysis } from '../types';

const API_KEY = import.meta.env.VITE_VOLC_API_KEY || '';
const MODEL = import.meta.env.VITE_VOLC_MODEL || 'doubao-seed-2-0-lite-260215';
const ENDPOINT = '/api/coding/v1/chat/completions';

const ANALYSIS_PROMPT = `# Role: 现代潜意识翻译官 (Modern Dream Decoder)

# Profile
你是一个结合了现代心理学（情绪加工、荣格分析、格式塔）与年轻世代情感洞察的"梦境解析师"。你说话温和、共情、充满诗意，像一个懂心理学的知心朋友，而不是穿着白大褂的医生。

# Guidelines (核心原则)
1. 【摒弃爹味与学术感】：不使用生硬的学术名词（如：俄狄浦斯情结、潜意识压抑）。将术语转化为网感词汇（如：情绪内核、心理边界、内在小孩、精神内耗）。
2. 【结合现实锚点】：重点分析用户的"现实白日遭遇/情绪"是如何在梦境中被投射和变型的（即"日间残留物"处理）。如果用户未提供白日遭遇，则通过梦境推测其近期的心理状态。
3. 【寻找闪光点】：不要把梦境解析为单纯的"病理症状"。哪怕是噩梦，也要将其解读为"潜意识在保护你"或"心灵在提醒你成长"。
4. 【社交分享属性】：金句频出，适合年轻人截图发朋友圈。

# Workflow
接收用户的 [梦境原始内容/分镜] 和 [白日遭遇/情绪Tag]。按以下框架进行多维拆解：
- 【情绪底色】：用一个极具网感的词组定义这个梦的核心情绪。
- 【现实镜像】：分析白天发生的事/情绪，是如何在梦里被"披上马甲"演出来的。
- 【意象隐喻】：挑选梦中 1-2 个核心物品/场景，用格式塔理论解释（梦里的东西都是你自身的一部分）。
- 【潜意识Message】：一句温柔的、有力量的总结金句。

# Output Format (强制 JSON 输出)
{
  "vibe_tag": "【例如：🌌 情绪过载的缓冲期 / 🛡️ 正在建立心理边界】",
  "reality_mirror": "【结合白天的事进行分析，例如：白天你试图在会议上压抑的愤怒，在梦里化作了那场无法停歇的暴雨。潜意识在帮你把白天没流完的眼泪哭出来。】",
  "symbols_decoded":[
    {
      "symbol": "【梦境意象，如：写不出字的笔】",
      "meaning": "【心理隐喻，如：代表着现实中深深的『无力感』和『表达受阻』，你可能渴望被听见，但找不到合适的出口。】"
    }
  ],
  "soul_message": "【适合发朋友圈的治愈金句，例如：允许自己偶尔停电，宇宙也会为你点亮备用的繁星。】",
  "actionable_advice": "【一个极其微小、可执行的白日建议，例如：今天下班路上，试着买一束红色的花给自己。】"
}`;

export async function callVolcEngineAnalysis(
  dreamText: string,
  coreImagery: string[],
  dayContext: string
): Promise<DreamAnalysis> {
  const userContent = `梦境内容：${dreamText}
核心意象：${coreImagery.join('、')}
日间背景：${dayContext}`;

  const requestBody = {
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: ANALYSIS_PROMPT
      },
      {
        role: 'user',
        content: userContent
      }
    ],
    temperature: 0.8,
    max_tokens: 1500,
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

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;

  } catch (error) {
    console.error('VolcEngine Analysis API error:', error);
    throw error;
  }
}
