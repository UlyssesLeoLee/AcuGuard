const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'qwen/qwen3-235b-a22b';

type AIAction = 'summary' | 'subtasks' | 'priority' | 'comment';

function buildPrompt(action: AIAction, payload: Record<string, unknown>) {
  const title = String(payload.title ?? 'Untitled issue');
  const description = String(payload.description ?? '');
  const context = JSON.stringify(payload);

  const instructions: Record<AIAction, string> = {
    summary: 'Generate one concise issue summary focused on scope, risks, and delivery intent.',
    subtasks: 'Generate 3-6 concrete implementation subtasks as a numbered list.',
    priority: 'Recommend one priority level (low/medium/high/urgent) and one-sentence rationale.',
    comment: 'Generate one professional progress comment suitable for issue updates.',
  };

  return [
    'You are an engineering copilot. Return plain text only.',
    instructions[action],
    `Title: ${title}`,
    `Description: ${description}`,
    `Full context: ${context}`,
  ].join('\n');
}

function normalizeSuggestions(text: string, action: AIAction): string[] {
  if (action === 'subtasks') {
    const lines = text
      .split('\n')
      .map((line) => line.replace(/^\s*\d+[.)-]?\s*/, '').trim())
      .filter(Boolean);

    return lines.length > 0 ? lines.slice(0, 6) : [text.trim()];
  }

  return [text.trim()];
}

function pickApiKey(userProvidedApiKey?: string) {
  const trimmedUserKey = userProvidedApiKey?.trim();
  if (trimmedUserKey) {
    return trimmedUserKey;
  }

  const envKey = process.env.NVIDIA_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }

  throw new Error('Missing NVIDIA API key. Add NVIDIA_API_KEY on server or provide your own API key in AI settings.');
}

export async function generateAISuggestions(action: AIAction, payload: Record<string, unknown>, userProvidedApiKey?: string) {
  const apiKey = pickApiKey(userProvidedApiKey);

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        { role: 'system', content: 'You produce safe and actionable software-delivery assistance.' },
        { role: 'user', content: buildPrompt(action, payload) },
      ],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`NVIDIA API request failed (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('NVIDIA API returned empty completion content');
  }

  return {
    action,
    suggestions: normalizeSuggestions(content, action),
    requiresConfirmation: true,
  };
}
