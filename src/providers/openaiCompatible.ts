import { ChatCompletionResponse, TranslationRequest } from './types';

export function buildChatCompletionBody(request: TranslationRequest) {
  return {
    model: request.provider.model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `你是划词翻译工具。把用户文本翻译成${request.targetLanguage}，只输出译文。源语言：${request.sourceLanguage}。`
      },
      {
        role: 'user',
        content: request.text
      }
    ]
  };
}

export function parseChatCompletion(data: ChatCompletionResponse): string {
  const result = data.choices?.[0]?.message?.content;
  if (typeof result !== 'string' || !result.trim()) {
    throw new Error('翻译接口没有返回有效译文');
  }
  return result.trim();
}

export async function translateWithOpenAiCompatible(request: TranslationRequest): Promise<string> {
  if (!request.provider.apiKey.trim()) {
    throw new Error('请先在设置里填写 API Key，或切换到本地演示提供者');
  }
  if (!request.provider.endpoint.trim()) {
    throw new Error('请先填写翻译接口地址');
  }
  if (!request.provider.model.trim()) {
    throw new Error('请先填写模型名称');
  }

  const response = await fetch(request.provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.provider.apiKey}`
    },
    body: JSON.stringify(buildChatCompletionBody(request))
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`翻译接口失败：${response.status} ${detail}`);
  }

  return parseChatCompletion(await response.json());
}
