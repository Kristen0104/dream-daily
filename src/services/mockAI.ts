import { StoryNode } from '../types';
import { callVolcEngineDreamArchitect } from './volcengine';

const MOCK_IMAGES = [
  'https://picsum.photos/seed/dream-mist/1280/720',
  'https://picsum.photos/seed/dream-hallway/1280/720',
  'https://picsum.photos/seed/dream-sky/1280/720',
  'https://picsum.photos/seed/dream-water/1280/720',
  'https://picsum.photos/seed/dream-light/1280/720',
];

const DREAM_TITLES = [
  '空山绝命红摩托', '失重之海', '无言之门', '时间走廊',
  '雾中归途', '灰色月光', '沉默的房间', '永不抵达',
  '循环之梦', '消失的楼梯', '边界之地', '记忆碎片',
];

const MOCK_TAGS = [
  ['窒息追逃', '红色摩托', '荒村玉米地'],
  ['失重下坠', '无尽天空', '半梦半醒'],
  ['寻找出口', '无尽走廊', '模糊的脸'],
  ['时光倒流', '旧物重现', '物是人非'],
  ['深海恐惧', '无法呼吸', '沉默的蓝'],
];

const NODE_TYPES: Array<'开场' | '怪诞' | '转场' | '抉择行动' | '结局'> = ['开场', '怪诞', '转场', '抉择行动', '结局'];

function extractTags(text: string): string[] {
  const lowerText = text.toLowerCase();

  if (/追|逃|跑|警察|害怕/.test(lowerText)) {
    return ['窒息追逃', '紧张压迫', '本能反应'];
  }
  if (/飞|下坠|漂浮|失重/.test(lowerText)) {
    return ['失重下坠', '灵魂出窍', '半梦半醒'];
  }
  if (/水|海|河|湖|淹死/.test(lowerText)) {
    return ['深海恐惧', '无法呼吸', '沉默的蓝'];
  }
  if (/找|迷路|找不到|出口/.test(lowerText)) {
    return ['寻找出口', '无尽迷宫', '方向迷失'];
  }
  if (/学校|考试|老师|同学/.test(lowerText)) {
    return ['校园追忆', '青春焦虑', ' unfinished business'];
  }

  return MOCK_TAGS[Math.floor(Math.random() * MOCK_TAGS.length)];
}

function splitIntoNodes(text: string): Array<{text: string, type: typeof NODE_TYPES[number], anchor: string | null}> {
  const sentences = text
    .split(/[。！？.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const resultNodes: Array<{text: string, type: typeof NODE_TYPES[number], anchor: string | null}> = [];

  if (sentences.length === 0) {
    return [
      { text: '周围一片模糊，只有一种熟悉的感觉萦绕不去。我想不起自己是谁，身在何处。', type: '开场', anchor: null },
      { text: '脚下的地面开始变得柔软，像踩在棉花上，又像踩在云端。', type: '怪诞', anchor: null },
      { text: '场景突然跳转，我站在一条没有尽头的走廊里，两边的门一模一样。', type: '转场', anchor: null },
      { text: '我随便推开了一扇门，门后是一片令人眩晕的白光。', type: '抉择行动', anchor: '推开了一扇门' },
      { text: '然后我醒了，心跳很快，但那个地方的感觉还残留在指尖。', type: '结局', anchor: null },
    ];
  }

  // 开场
  resultNodes.push({
    text: toFirstPerson(sentences[0]),
    type: '开场',
    anchor: null
  });

  // 中间节点
  for (let i = 1; i < Math.min(sentences.length - 1, 4); i++) {
    const isDecision = /我.*?[把拿推打开跑跳进走].*?[了门去里入].*/.test(sentences[i]);
    const anchorMatch = sentences[i].match(/我.*?([把拿推打开跑跳进走][^\s。！？,，]{2,8})/);

    resultNodes.push({
      text: toFirstPerson(sentences[i]),
      type: i % 2 === 0 ? '怪诞' : '转场',
      anchor: isDecision && anchorMatch ? anchorMatch[1] : null
    });
  }

  // 如果不够，补充抉择行动节点
  if (resultNodes.length < 4 && sentences.length >= 2) {
    const decisionSentence = sentences[Math.min(1, sentences.length - 1)];
    const anchorMatch = decisionSentence.match(/我.*?([把拿推打开跑跳进走][^\s。！？,，]{2,8})/);
    resultNodes.push({
      text: toFirstPerson(decisionSentence),
      type: '抉择行动',
      anchor: anchorMatch ? anchorMatch[1] : null
    });
  }

  // 结局
  const lastSentence = sentences[sentences.length - 1];
  resultNodes.push({
    text: toFirstPerson(lastSentence) + '...然后我醒了。',
    type: '结局',
    anchor: null
  });

  return resultNodes.slice(0, 5);
}

function toFirstPerson(text: string): string {
  if (!text.includes('我') && !text.includes('I ')) {
    if (text.length < 30) {
      return '我看着这一切，' + text;
    }
  }
  return text;
}

function generateSceneDescription(index: number, text: string): string {
  const baseDescriptions = [
    '眼前是一片朦胧的景象，四周笼罩着薄雾，远处的景物模糊不清，只有一些轮廓隐约可见，空气中有一种说不出的神秘感。',
    '环顾四周，发现自己站在一个似曾相识又很陌生的地方，光线柔和而暗淡，营造出一种梦幻般的氛围。',
    '场景突然发生变化，周围的一切开始扭曲、模糊，像是在水中晕染开来的颜料，给人一种不真实的感觉。',
    '低头看着自己的手，或是眼前的某个物品，细节清晰可见，但背景却逐渐模糊，形成一种奇妙的对比。',
    '视线开始变得模糊，眼前的景物慢慢褪去，像是从梦中醒来的感觉，一切都在慢慢消散。',
  ];
  return baseDescriptions[index % baseDescriptions.length];
}

function generateVisualPrompt(index: number, text: string): string {
  const styleSuffix = ', thin soft line art, minimal outlines, loose watercolor wash, high saturation contrast colors, transparent watercolor texture, dreamy blurry memory, half clear half hazy, broken dream feeling, magical atmosphere --ar 16:9';
  const basePrompts = [
    'POV, first-person perspective, mysterious atmosphere, misty surroundings',
    'POV, looking around in dreamlike place, soft diffused lighting, ethereal mood',
    'POV, blurred movement, surreal scene transition, overcast lighting',
    'POV, close-up view, intense atmosphere, dramatic shadows',
    'POV, fading vision, waking up feeling, soft focus',
  ];
  return basePrompts[index % basePrompts.length] + styleSuffix;
}

async function processDreamWithMock(originalText: string): Promise<{
  dreamTitle: string;
  tags: string[];
  storyNodes: StoryNode[];
}> {
  const tags = extractTags(originalText);
  const rawNodes = splitIntoNodes(originalText);
  const dreamTitle = DREAM_TITLES[Math.floor(Math.random() * DREAM_TITLES.length)];

  const storyNodes: StoryNode[] = rawNodes.map((node, index) => ({
    nodeId: index + 1,
    nodeType: node.type,
    narrativeText: node.text,
    decisionAnchor: node.anchor,
    sceneDescription: generateSceneDescription(index, node.text),
    visualPrompt: generateVisualPrompt(index, node.text),
    imageUrl: MOCK_IMAGES[index % MOCK_IMAGES.length],
  }));

  return {
    dreamTitle,
    tags,
    storyNodes,
  };
}

export async function processDream(originalText: string): Promise<{
  dreamTitle: string;
  tags: string[];
  storyNodes: StoryNode[];
}> {
  try {
    console.log('Calling VolcEngine API...');
    const result = await callVolcEngineDreamArchitect(originalText);

    const storyNodes: StoryNode[] = result.story_nodes.map((node, index) => ({
      nodeId: node.node_id,
      nodeType: node.node_type,
      narrativeText: node.narrative_text,
      decisionAnchor: node.decision_anchor,
      sceneDescription: node.scene_description || '',
      visualPrompt: node.visual_prompt,
      imageUrl: MOCK_IMAGES[index % MOCK_IMAGES.length],
    }));

    return {
      dreamTitle: result.dream_title,
      tags: result.tags,
      storyNodes,
    };
  } catch (error) {
    console.warn('VolcEngine API failed, falling back to mock:', error);
    return await processDreamWithMock(originalText);
  }
}
