import { ConnectionProfile } from '../../models/connection-profile.model';
import { OpenAIStrategy } from './openai-strategy';

/**
 * NanoGPT-specific implementation extending OpenAI API format.
 * Matches standard OpenAI formats but explicitly forces NanoGPT endpoints.
 */
export class NanoGptStrategy extends OpenAIStrategy {
  protected override buildHeaders(conn: ConnectionProfile): Record<string, string> {
    const headers = super.buildHeaders(conn);
    return headers;
  }
}
