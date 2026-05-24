import { describe, expect, it } from 'vitest';
import { buildChatCompletionBody, parseChatCompletion } from '../openaiCompatible';

const request = {
  text: 'hello',
  sourceLanguage: 'auto',
  targetLanguage: '中文',
  provider: {
    id: 'openai-compatible' as const,
    label: 'OpenAI 兼容接口',
    endpoint: 'https://example.com/v1/chat/completions',
    apiKey: 'test-api-key',
    appId: '',
    secretKey: '',
    model: 'qwen-plus'
  }
};

describe('buildChatCompletionBody', () => {
  it('builds a translation-only chat request', () => {
    expect(buildChatCompletionBody(request)).toMatchObject({
      model: 'qwen-plus',
      temperature: 0.2,
      messages: [
        { role: 'system', content: expect.stringContaining('中文') },
        { role: 'user', content: 'hello' }
      ]
    });
  });
});

describe('parseChatCompletion', () => {
  it('extracts and trims assistant content', () => {
    expect(parseChatCompletion({ choices: [{ message: { content: '  你好  ' } }] })).toBe('你好');
  });

  it('rejects empty provider responses', () => {
    expect(() => parseChatCompletion({ choices: [{ message: { content: '' } }] })).toThrow('翻译接口没有返回有效译文');
  });
});
