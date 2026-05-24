import { translateWithMock } from './mock';
import { translateWithOpenAiCompatible } from './openaiCompatible';
import { TranslationRequest } from './types';

export function translateText(request: TranslationRequest): Promise<string> {
  if (request.provider.id === 'mock') {
    return Promise.resolve(translateWithMock(request));
  }
  return translateWithOpenAiCompatible(request);
}
