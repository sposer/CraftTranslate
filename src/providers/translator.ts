import { translateWithBaiduGeneral } from './baiduGeneral';
import { translateWithOpenAiCompatible } from './openaiCompatible';
import { TranslationRequest } from './types';

export function translateText(request: TranslationRequest): Promise<string> {
  if (request.provider.kind === 'baidu-general') {
    return translateWithBaiduGeneral(request);
  }
  return translateWithOpenAiCompatible(request);
}
