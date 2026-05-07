import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { createThinkFilter } from '@/lib/stream-filter';

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'qwen/qwen3-235b-a22b';
const NVIDIA_DEFAULT_API_KEY = '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';

type AIAction = 'summary' | 'subtasks' | 'priority' | 'comment';

const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  summary: 'Generate one concise issue summary focused on scope, risks, and delivery intent.',
  subtasks: 'Generate 3-6 concrete implementation subtasks as a numbered list.',
  priority: 'Recommend one priority level (low/medium/high/urgent) and one-sentence rationale.',
  comment: 'Generate one professional progress comment suitable for issue updates.',
};

export function normalizeSuggestions(text: string, action: AIAction): string[] {
  if (action === 'subtasks') {
    const lines = text
      .split('\n')
      .map((line) => line.replace(/^\s*\d+[.)-]?\s*/, '').trim())
      .filter(Boolean);

    return lines.length > 0 ? lines.slice(0, 6) : [text.trim()];
  }

  return [text.trim()];
}

export function pickApiKey(userProvidedApiKey?: string) {
  const trimmedUserKey = userProvidedApiKey?.trim();
  if (trimmedUserKey) return trimmedUserKey;

  const envKey = process.env.NVIDIA_API_KEY?.trim();
  if (envKey) return envKey;

  return NVIDIA_DEFAULT_API_KEY;
}

function buildModel(apiKey: string) {
  return new ChatOpenAI({
    apiKey,
    model: NVIDIA_MODEL,
    temperature: 0.2,
    maxTokens: 500,
    configuration: { baseURL: NVIDIA_BASE_URL },
  });
}

async function runActionWithLangChain(action: AIAction, payload: Record<string, unknown>, userProvidedApiKey?: string) {
  const apiKey = pickApiKey(userProvidedApiKey);
  const model = buildModel(apiKey);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You produce safe and actionable software-delivery assistance. Return plain text only.'],
    ['human', `Task: {instruction}\nTitle: {title}\nDescription: {description}\nFull context: {context}`],
  ]);

  const response = await prompt.pipe(model).invoke({
    instruction: ACTION_INSTRUCTIONS[action],
    title: String(payload.title ?? 'Untitled issue'),
    description: String(payload.description ?? ''),
    context: JSON.stringify(payload),
  });

  const rawText = response.text ?? '';
  const filter = createThinkFilter();
  const content = filter(rawText).trim();
  if (!content) {
    throw new Error('NVIDIA API returned empty completion content');
  }

  return {
    action,
    suggestions: normalizeSuggestions(content, action),
    requiresConfirmation: true,
  };
}

const CHAT_COMMANDS: Record<string, AIAction> = {
  '/summary': 'summary',
  '/subtasks': 'subtasks',
  '/priority': 'priority',
  '/comment': 'comment',
};

export async function generateAISuggestions(action: AIAction, payload: Record<string, unknown>, userProvidedApiKey?: string) {
  return runActionWithLangChain(action, payload, userProvidedApiKey);
}

export async function runAIChatCommand(input: string, payload: Record<string, unknown>, userProvidedApiKey?: string) {
  const trimmed = input.trim();
  const [command] = trimmed.split(/\s+/);
  const action = CHAT_COMMANDS[command.toLowerCase()];

  if (!action) {
    const supported = Object.keys(CHAT_COMMANDS).join(', ');
    return {
      ok: false as const,
      message: `Unsupported command. Try one of: ${supported}`,
    };
  }

  const result = await runActionWithLangChain(action, payload, userProvidedApiKey);
  return {
    ok: true as const,
    action,
    suggestions: result.suggestions,
  };
}
