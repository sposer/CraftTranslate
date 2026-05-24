import { TranslationRequest } from './types';

export function translateWithMock(request: TranslationRequest): string {
  return `演示译文 ${request.targetLanguage}\n\n${request.text}`;
}
