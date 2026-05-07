/**
 * Integration tests for AI features.
 *
 * The NVIDIA API is mocked at the LangChain layer with realistic
 * qwen/qwen3-235b-a22b-style responses (including <think>...</think> preambles)
 * so every layer of application logic is exercised without outbound network access:
 *
 *   - pickApiKey priority (user key → env key → default)
 *   - prompt construction and model invocation
 *   - normalizeSuggestions parsing (subtask stripping, length cap)
 *   - chat command routing (/summary, /subtasks, /priority, /comment)
 *   - unsupported command rejection
 *   - error propagation when the API returns an error
 *
 * NOTE: To run against the live NVIDIA API add the caller's IP to the api-key
 * allowlist in the NVIDIA NGC dashboard, then remove the mocks below.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAISuggestions, runAIChatCommand } from '@/lib/ai';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// vi.hoisted ensures mockInvoke exists before vi.mock hoisting moves factories to top
const mockInvoke = vi.hoisted(() => vi.fn());

// Mock ChatOpenAI as a proper class so `new ChatOpenAI(...)` works
vi.mock('@langchain/openai', () => {
  const ChatOpenAI = vi.fn(function (this: Record<string, unknown>, config: unknown) {
    this.config = config;
  });
  return { ChatOpenAI };
});

// Mock the prompt chain: fromMessages(...).pipe(model).invoke(...)
vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: vi.fn().mockReturnValue({
      pipe: vi.fn().mockReturnValue({ invoke: mockInvoke }),
    }),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simulate the qwen3 pattern: <think> preamble then actual content */
function makeModelResponse(content: string) {
  return { text: `<think>\nLet me think about this carefully.\n</think>\n${content}` };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_ISSUE = {
  title: 'User login fails intermittently under high load',
  description:
    'Under load testing with 500 concurrent users approximately 5% of login requests fail ' +
    'with HTTP 503. The error appears to originate in the auth service when the JWT signing ' +
    'library times out. Suspected cause: connection pool exhaustion to the Redis session store.',
  status: 'in_progress',
  priority: 'high',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.NVIDIA_API_KEY;
});

// ─── generateAISuggestions — summary ─────────────────────────────────────────

describe('generateAISuggestions — summary', () => {
  it('returns correct shape with requiresConfirmation=true', async () => {
    mockInvoke.mockResolvedValueOnce(
      makeModelResponse(
        'This issue tracks intermittent login failures under load. Root cause is suspected ' +
          'connection pool exhaustion in the Redis session store causing JWT signing timeouts.'
      )
    );

    const result = await generateAISuggestions('summary', SAMPLE_ISSUE);

    expect(result.action).toBe('summary');
    expect(result.requiresConfirmation).toBe(true);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toContain('login failures');
  });

  it('think tags in model response are stripped from the suggestion', async () => {
    mockInvoke.mockResolvedValueOnce(
      makeModelResponse('Auth service is timing out under high load.')
    );

    const result = await generateAISuggestions('summary', SAMPLE_ISSUE);
    expect(result.suggestions[0]).not.toMatch(/<think>/i);
    expect(result.suggestions[0]).not.toMatch(/<\/think>/i);
    expect(result.suggestions[0]).not.toContain('Let me think');
  });

  it('summary text is trimmed of leading/trailing whitespace', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '   Concise summary.   ' });
    const result = await generateAISuggestions('summary', SAMPLE_ISSUE);
    expect(result.suggestions[0]).toBe('Concise summary.');
  });

  it('uses user-provided API key over env and default', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    mockInvoke.mockResolvedValueOnce(makeModelResponse('summary text'));

    await generateAISuggestions('summary', SAMPLE_ISSUE, 'nvapi-user-key');

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'nvapi-user-key' })
    );
  });

  it('falls back to env NVIDIA_API_KEY when no user key supplied', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    process.env.NVIDIA_API_KEY = 'nvapi-env-key';
    mockInvoke.mockResolvedValueOnce(makeModelResponse('summary text'));

    await generateAISuggestions('summary', SAMPLE_ISSUE);

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'nvapi-env-key' })
    );
  });

  it('throws when model returns empty content', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '' });
    await expect(generateAISuggestions('summary', SAMPLE_ISSUE)).rejects.toThrow(
      'NVIDIA API returned empty completion content'
    );
  });

  it('throws when model returns whitespace-only content', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '   ' });
    await expect(generateAISuggestions('summary', SAMPLE_ISSUE)).rejects.toThrow(
      'NVIDIA API returned empty completion content'
    );
  });
});

// ─── generateAISuggestions — subtasks ────────────────────────────────────────

describe('generateAISuggestions — subtasks', () => {
  it('splits numbered list into separate subtask items', async () => {
    mockInvoke.mockResolvedValueOnce(
      makeModelResponse(
        '1. Reproduce the 503 error under controlled load\n' +
          '2. Profile Redis connection pool under 500 concurrent users\n' +
          '3. Increase connection pool size or add connection timeout\n' +
          '4. Add monitoring alert for pool exhaustion\n' +
          '5. Write regression test for auth service under load'
      )
    );

    const result = await generateAISuggestions('subtasks', SAMPLE_ISSUE);

    expect(result.action).toBe('subtasks');
    expect(result.suggestions).toHaveLength(5);
    expect(result.suggestions[0]).toBe('Reproduce the 503 error under controlled load');
  });

  it('strips period numbering (1. 2. 3.)', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '1. First\n2. Second\n3. Third' });
    const result = await generateAISuggestions('subtasks', SAMPLE_ISSUE);
    expect(result.suggestions).toEqual(['First', 'Second', 'Third']);
  });

  it('strips parenthesis numbering (1) 2) 3))', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '1) Alpha\n2) Beta\n3) Gamma' });
    const result = await generateAISuggestions('subtasks', SAMPLE_ISSUE);
    expect(result.suggestions).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('caps at 6 subtasks even when model returns more', async () => {
    const tenItems = Array.from({ length: 10 }, (_, i) => `${i + 1}. Task ${i + 1}`).join('\n');
    mockInvoke.mockResolvedValueOnce({ text: tenItems });

    const result = await generateAISuggestions('subtasks', SAMPLE_ISSUE);
    expect(result.suggestions).toHaveLength(6);
  });

  it('filters blank lines between subtasks', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '1. One\n\n2. Two\n\n3. Three' });
    const result = await generateAISuggestions('subtasks', SAMPLE_ISSUE);
    expect(result.suggestions).toEqual(['One', 'Two', 'Three']);
  });

  it('returns single-item array when model returns un-listed text', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'Please implement the whole thing.' });
    const result = await generateAISuggestions('subtasks', SAMPLE_ISSUE);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toBe('Please implement the whole thing.');
  });
});

// ─── generateAISuggestions — priority ────────────────────────────────────────

describe('generateAISuggestions — priority', () => {
  it('returns single suggestion with priority keyword', async () => {
    mockInvoke.mockResolvedValueOnce(
      makeModelResponse('high — this is causing active production failures for a subset of users.')
    );

    const result = await generateAISuggestions('priority', SAMPLE_ISSUE);

    expect(result.action).toBe('priority');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toContain('high');
  });

  it('wraps multi-line priority response as single suggestion', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'medium\nJustification here.' });
    const result = await generateAISuggestions('priority', SAMPLE_ISSUE);
    expect(result.suggestions).toHaveLength(1);
  });
});

// ─── generateAISuggestions — comment ─────────────────────────────────────────

describe('generateAISuggestions — comment', () => {
  it('returns single professional comment', async () => {
    mockInvoke.mockResolvedValueOnce(
      makeModelResponse(
        'Investigated the Redis connection pool behaviour under load. ' +
          'Identified that the default pool size of 10 is insufficient for 500 concurrent users. ' +
          'Preparing a fix to increase pool size and add circuit breaker logic.'
      )
    );

    const result = await generateAISuggestions('comment', SAMPLE_ISSUE);

    expect(result.action).toBe('comment');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toContain('Redis');
  });
});

// ─── generateAISuggestions — minimal payload ─────────────────────────────────

describe('generateAISuggestions — minimal payload', () => {
  it('summary works with title-only payload', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'This fixes a button colour.' });
    const result = await generateAISuggestions('summary', { title: 'Fix button colour' });
    expect(result.suggestions[0]).toBe('This fixes a button colour.');
  });

  it('subtasks works with empty description', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '1. Design search UI\n2. Wire up API\n3. Write tests' });
    const result = await generateAISuggestions('subtasks', { title: 'Add search' });
    expect(result.suggestions).toHaveLength(3);
  });
});

// ─── runAIChatCommand — slash commands ───────────────────────────────────────

describe('runAIChatCommand — slash commands', () => {
  it('/summary routes to summary action', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'Summary of the issue.' });
    const result = await runAIChatCommand('/summary', SAMPLE_ISSUE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe('summary');
      expect(result.suggestions).toHaveLength(1);
    }
  });

  it('/subtasks routes to subtasks action and parses list', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '1. Step one\n2. Step two\n3. Step three' });
    const result = await runAIChatCommand('/subtasks', SAMPLE_ISSUE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe('subtasks');
      expect(result.suggestions).toHaveLength(3);
    }
  });

  it('/priority routes to priority action', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'high — active incident.' });
    const result = await runAIChatCommand('/priority', SAMPLE_ISSUE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe('priority');
    }
  });

  it('/comment routes to comment action', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'Investigation ongoing, ETA tomorrow.' });
    const result = await runAIChatCommand('/comment', SAMPLE_ISSUE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe('comment');
    }
  });

  it('commands are case-insensitive (/SUMMARY = /summary)', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'Summary text.' });
    const result = await runAIChatCommand('/SUMMARY', SAMPLE_ISSUE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe('summary');
    }
  });

  it('leading/trailing whitespace in command is ignored', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'Summary text.' });
    const result = await runAIChatCommand('  /summary  ', SAMPLE_ISSUE);
    expect(result.ok).toBe(true);
  });

  it('passes user API key through to the model', async () => {
    const { ChatOpenAI } = await import('@langchain/openai');
    mockInvoke.mockResolvedValueOnce({ text: 'text' });
    await runAIChatCommand('/summary', SAMPLE_ISSUE, 'nvapi-user-key');
    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'nvapi-user-key' })
    );
  });
});

// ─── runAIChatCommand — unsupported commands ──────────────────────────────────

describe('runAIChatCommand — unsupported commands', () => {
  it('returns ok=false for unknown slash command', async () => {
    const result = await runAIChatCommand('/unknown', SAMPLE_ISSUE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/unsupported/i);
      expect(result.message).toContain('/summary');
    }
  });

  it('returns ok=false for plain text without slash', async () => {
    const result = await runAIChatCommand('please help me', SAMPLE_ISSUE);
    expect(result.ok).toBe(false);
  });

  it('returns ok=false for empty string', async () => {
    const result = await runAIChatCommand('', SAMPLE_ISSUE);
    expect(result.ok).toBe(false);
  });

  it('returns ok=false for slash-only input', async () => {
    const result = await runAIChatCommand('/', SAMPLE_ISSUE);
    expect(result.ok).toBe(false);
  });

  it('does not call the LangChain model for unsupported commands', async () => {
    await runAIChatCommand('/invalid', SAMPLE_ISSUE);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

// ─── Error propagation ────────────────────────────────────────────────────────

describe('generateAISuggestions — error handling', () => {
  it('propagates network errors from the AI client', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('403 Host not in allowlist'));
    await expect(generateAISuggestions('summary', SAMPLE_ISSUE, 'bad-key')).rejects.toThrow(
      '403 Host not in allowlist'
    );
  });

  it('propagates timeout errors', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Request timed out'));
    await expect(generateAISuggestions('priority', SAMPLE_ISSUE)).rejects.toThrow(
      'Request timed out'
    );
  });
});
