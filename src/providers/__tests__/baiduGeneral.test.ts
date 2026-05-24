import { describe, expect, it } from 'vitest';
import { buildBaiduSearchParams, buildBaiduSign, mapLanguageToBaidu, parseBaiduResponse } from '../baiduGeneral';

const request = {
  text: 'hello',
  sourceLanguage: 'auto',
  targetLanguage: '中文',
  provider: {
    id: 'baidu-general' as const,
    label: '百度通用文本翻译',
    endpoint: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
    apiKey: '',
    appId: 'demo-app-id',
    secretKey: 'demo-secret',
    model: ''
  }
};

describe('mapLanguageToBaidu', () => {
  it('maps common language names to Baidu language codes', () => {
    expect(mapLanguageToBaidu('中文')).toBe('zh');
    expect(mapLanguageToBaidu('英语')).toBe('en');
    expect(mapLanguageToBaidu('auto')).toBe('auto');
  });
});

describe('buildBaiduSearchParams', () => {
  it('builds signed form parameters', () => {
    const params = buildBaiduSearchParams(request, '12345');

    expect(params.get('q')).toBe('hello');
    expect(params.get('from')).toBe('auto');
    expect(params.get('to')).toBe('zh');
    expect(params.get('appid')).toBe('demo-app-id');
    expect(params.get('salt')).toBe('12345');
    expect(params.get('sign')).toBe(buildBaiduSign('hello', 'demo-app-id', '12345', 'demo-secret'));
  });

  it('requires app id and secret key', () => {
    expect(() => buildBaiduSearchParams({
      ...request,
      provider: { ...request.provider, appId: '' }
    })).toThrow('请先填写百度翻译 APP ID');
    expect(() => buildBaiduSearchParams({
      ...request,
      provider: { ...request.provider, secretKey: '' }
    })).toThrow('请先填写百度翻译密钥');
  });
});

describe('parseBaiduResponse', () => {
  it('joins translated lines', () => {
    expect(parseBaiduResponse({
      trans_result: [
        { src: 'hello', dst: '你好' },
        { src: 'world', dst: '世界' }
      ]
    })).toBe('你好\n世界');
  });

  it('surfaces Baidu error responses', () => {
    expect(() => parseBaiduResponse({ error_code: '54003', error_msg: 'Invalid Access Limit' })).toThrow('百度翻译失败：54003 Invalid Access Limit');
  });
});
