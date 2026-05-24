import { md5 } from 'js-md5';
import { TranslationRequest } from './types';

interface BaiduTranslateResponse {
  error_code?: string;
  error_msg?: string;
  trans_result?: Array<{
    src: string;
    dst: string;
  }>;
}

export function mapLanguageToBaidu(language: string): string {
  const normalized = language.trim().toLowerCase();
  const languageMap: Record<string, string> = {
    auto: 'auto',
    自动: 'auto',
    中文: 'zh',
    汉语: 'zh',
    zh: 'zh',
    'zh-cn': 'zh',
    english: 'en',
    英文: 'en',
    英语: 'en',
    en: 'en',
    japanese: 'jp',
    日文: 'jp',
    日语: 'jp',
    ja: 'jp',
    jp: 'jp',
    korean: 'kor',
    韩文: 'kor',
    韩语: 'kor',
    ko: 'kor',
    kor: 'kor'
  };
  return languageMap[normalized] ?? normalized;
}

export function buildBaiduSign(text: string, appId: string, salt: string, secretKey: string): string {
  return md5(`${appId}${text}${salt}${secretKey}`);
}

export function buildBaiduSearchParams(request: TranslationRequest, salt = String(Date.now())): URLSearchParams {
  const appId = request.provider.appId.trim();
  const secretKey = request.provider.secretKey.trim();
  if (!appId) {
    throw new Error('请先填写百度翻译 APP ID');
  }
  if (!secretKey) {
    throw new Error('请先填写百度翻译密钥');
  }

  return new URLSearchParams({
    q: request.text,
    from: mapLanguageToBaidu(request.sourceLanguage),
    to: mapLanguageToBaidu(request.targetLanguage),
    appid: appId,
    salt,
    sign: buildBaiduSign(request.text, appId, salt, secretKey)
  });
}

export function parseBaiduResponse(data: BaiduTranslateResponse): string {
  if (data.error_code) {
    throw new Error(`百度翻译失败：${data.error_code} ${data.error_msg ?? ''}`.trim());
  }
  const result = data.trans_result?.map((item) => item.dst).filter(Boolean).join('\n');
  if (!result) {
    throw new Error('百度翻译没有返回有效译文');
  }
  return result;
}

export async function translateWithBaiduGeneral(request: TranslationRequest): Promise<string> {
  const endpoint = request.provider.endpoint.trim();
  if (!endpoint) {
    throw new Error('请先填写百度翻译接口地址');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: buildBaiduSearchParams(request)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`百度翻译请求失败：${response.status} ${detail}`);
  }

  return parseBaiduResponse(await response.json());
}
