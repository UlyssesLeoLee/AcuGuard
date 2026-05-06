const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'qwen/qwen3-235b-a22b';
const FALLBACK_TEST_API_KEY = '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';

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

export async function generateAISuggestions(action: AIAction, payload: Record<string, unknown>) {
  const apiKey = process.env.NVIDIA_API_KEY || FALLBACK_TEST_API_KEY;

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
