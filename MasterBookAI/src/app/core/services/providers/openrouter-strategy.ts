import { ConnectionProfile } from '../../models/connection-profile.model';
import { OpenAIStrategy } from './openai-strategy';

/**
 * OpenRouter-specific implementation extending OpenAI API format.
 * Automatically injects the required headers for OpenRouter leaderboards and routing.
 */
export class OpenRouterStrategy extends OpenAIStrategy {
  protected override buildHeaders(conn: ConnectionProfile): Record<string, string> {
    const headers = super.buildHeaders(conn);
    
    // Inject OpenRouter specific headers
    headers['HTTP-Referer'] = 'masterbook.ai';
    headers['X-OpenRouter-Title'] = 'MasterBookAI';
    
    return headers;
  }
}
