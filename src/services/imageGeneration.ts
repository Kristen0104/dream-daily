// 生产环境用后端代理（不需要前端 API Key），开发环境可以用 .env
const API_KEY = import.meta.env.VITE_VOLC_API_KEY || '';
const ENDPOINT = '/api/images/images/generations';
const MODEL = 'doubao-seedream-4-0-250828';

interface ImageGenerationRequest {
  model: string;
  prompt: string;
  sequential_image_generation: 'disabled';
  response_format: 'url';
  size: '2K';
  stream: boolean;
  watermark: boolean;
}

interface ImageGenerationResponse {
  data: Array<{
    url: string;
  }>;
}

export async function generateDreamImage(prompt: string): Promise<string> {
  const requestBody: ImageGenerationRequest = {
    model: MODEL,
    prompt: prompt,
    sequential_image_generation: 'disabled',
    response_format: 'url',
    size: '2K',
    stream: false,
    watermark: true,
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // 仅在开发环境有 API Key 时添加（生产环境由后端代理添加）
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image Generation API Error:', response.status, errorText);
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data: ImageGenerationResponse = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].url;
    }
    throw new Error('No image URL in response');

  } catch (error) {
    console.error('Image generation error:', error);
    // 返回 placeholder 图片
    return `https://picsum.photos/seed/${Math.random().toString(36).substr(2, 9)}/1280/720`;
  }
}

// 批量生成梦境图片
export async function generateDreamImages(
  visualPrompts: string[],
  onProgress?: (index: number, total: number) => void
): Promise<string[]> {
  const imageUrls: string[] = [];

  for (let i = 0; i < visualPrompts.length; i++) {
    try {
      const url = await generateDreamImage(visualPrompts[i]);
      imageUrls.push(url);
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error);
      imageUrls.push(`https://picsum.photos/seed/dream-${i}/1280/720`);
    }

    if (onProgress) {
      onProgress(i + 1, visualPrompts.length);
    }

    // 避免请求过快，加一点延迟
    if (i < visualPrompts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return imageUrls;
}
