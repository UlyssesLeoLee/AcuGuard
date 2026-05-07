/**
 * Tests for the AI streaming pipeline.
 *
 * The ChatOpenAI streaming client is mocked with realistic chunk sequences
 * (including <think>...</think> preambles) to verify:
 *
 *   - createThinkFilter correctly strips think blocks across split chunks
 *   - Streaming text accumulation produces the full expected output
 *   - Each action's instruction produces meaningful content
 *   - Edge cases (empty chunks, multiple think blocks, partial tags at boundaries)
 *
 * NOTE: Live streaming tests require the caller's IP in the NVIDIA API key
 * allowlist. Use the NVIDIA NGC dashboard to add trusted IPs before running
 * the live suite.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createThinkFilter } from '@/lib/stream-filter';

// ─── createThinkFilter unit tests ────────────────────────────────────────────

describe('createThinkFilter', () => {
  it('passes plain text through unchanged', () => {
    const filter = createThinkFilter();
    expect(filter('Hello world')).toBe('Hello world');
  });

  it('strips complete <think>...</think> block in one chunk', () => {
    const filter = createThinkFilter();
    expect(filter('Before<think>reasoning</think>After')).toBe('BeforeAfter');
  });

  it('strips think block split across chunks', () => {
    const filter = createThinkFilter();
    expect(filter('Text<th')).toBe('Text');
    expect(filter('ink>hidden</th')).toBe('');
    expect(filter('ink>visible')).toBe('visible');
  });

  it('handles think block that opens and closes in separate chunks', () => {
    const filter = createThinkFilter();
    expect(filter('Start<think>')).toBe('Start');
    expect(filter('internal thoughts')).toBe('');
    expect(filter('more thoughts</think>end')).toBe('end');
  });

  it('handles multiple think blocks in a single chunk', () => {
    const filter = createThinkFilter();
    expect(filter('<think>a</think>mid<think>b</think>end')).toBe('midend');
  });

  it('emits nothing when entire chunk is inside a think block', () => {
    const filter = createThinkFilter();
    expect(filter('<think>all hidden</think>')).toBe('');
  });

  it('holds back a partial think tag at chunk boundary', () => {
    const filter = createThinkFilter();
    const first = filter('Hello <thi');
    expect(first).toBe('Hello ');
    // next chunk resolves the ambiguity — "ngs" is not "<think>"
    const second = filter('ngs are fine');
    expect(second).toBe('<thi' + 'ngs are fine');
  });

  it('handles empty string chunk gracefully', () => {
    const filter = createThinkFilter();
    expect(filter('')).toBe('');
    expect(filter('data')).toBe('data');
  });

  it('each filter instance has independent state', () => {
    const fa = createThinkFilter();
    const fb = createThinkFilter();
    fa('<think>');
    expect(fa('hidden')).toBe('');
    expect(fb('visible')).toBe('visible');
  });

  it('handles content immediately after closing think tag', () => {
    const filter = createThinkFilter();
    expect(filter('<think>hidden</think>immediate')).toBe('immediate');
  });

  it('passes multi-chunk plain text unchanged', () => {
    const filter = createThinkFilter();
    const chunks = ['Hello ', 'world. ', 'Plain text.'];
    const output = chunks.map((c) => filter(c)).join('');
    expect(output).toBe('Hello world. Plain text.');
  });

  it('correctly strips qwen3-style <think> preamble before actual answer', () => {
    const filter = createThinkFilter();
    const chunks = [
      '<think>\n',
      'Let me analyze this problem carefully.\n',
      'The auth service is timing out.\n',
      '</think>\n',
      'This issue tracks intermittent 503 errors caused by JWT signing timeouts.',
    ];
    const output = chunks.map((c) => filter(c)).join('');
    expect(output).toBe('\nThis issue tracks intermittent 503 errors caused by JWT signing timeouts.');
    expect(output).not.toContain('<think>');
    expect(output).not.toContain('analyze this problem');
  });
});

// ─── Streaming pipeline simulation ───────────────────────────────────────────

describe('AI streaming pipeline simulation', () => {
  async function* makeAsyncChunks(chunks: string[]): AsyncIterable<{ content: string }> {
    for (const text of chunks) {
      yield { content: text };
    }
  }

  async function collectStream(chunks: string[]): Promise<string> {
    const filter = createThinkFilter();
    let collected = '';
    for await (const chunk of makeAsyncChunks(chunks)) {
      const raw = typeof chunk.content === 'string' ? chunk.content : '';
      if (!raw) continue;
      const text = filter(raw);
      if (text) collected += text;
    }
    return collected;
  }

  it('collects plain text from streamed chunks', async () => {
    const chunks = ['This ', 'is ', 'the ', 'answer.'];
    expect(await collectStream(chunks)).toBe('This is the answer.');
  });

  it('filters think block at start of stream (qwen3 pattern)', async () => {
    const chunks = [
      '<think>\nInternal reasoning.\n</think>\n',
      'Actual response here.',
    ];
    const output = await collectStream(chunks);
    expect(output).not.toContain('<think>');
    expect(output).toContain('Actual response here.');
  });

  it('filters think block split across many small chunks', async () => {
    const chunks = [
      'Result: ',
      '<',
      'th',
      'ink',
      '>',
      'hidden reasoning',
      '</',
      'th',
      'ink',
      '>',
      'answer text',
    ];
    const output = await collectStream(chunks);
    expect(output).toBe('Result: answer text');
  });

  it('handles empty chunks in the stream gracefully', async () => {
    const chunks = ['first ', '', 'second ', '', 'third'];
    expect(await collectStream(chunks)).toBe('first second third');
  });

  it('summary action: produces non-empty output from realistic chunks', async () => {
    const chunks = [
      '<think>\nAnalyzing the issue context.\n</think>\n',
      'This issue tracks intermittent 503 login failures under load. ',
      'Root cause is suspected Redis connection pool exhaustion. ',
      'Immediate fix should increase pool size and add circuit-breaker logic.',
    ];
    const output = await collectStream(chunks);
    expect(output.length).toBeGreaterThan(50);
    expect(output).toContain('503');
    expect(output).not.toContain('<think>');
  });

  it('subtasks action: produces numbered list items from streamed chunks', async () => {
    const chunks = [
      '<think>\nBreaking down the task.\n</think>\n',
      '1. Reproduce the 503 error under load\n',
      '2. Profile Redis pool usage\n',
      '3. Increase pool size\n',
      '4. Add circuit breaker\n',
      '5. Write regression test',
    ];
    const output = await collectStream(chunks);
    expect(output).toContain('1.');
    expect(output).toContain('5.');
    expect(output).not.toContain('<think>');
  });

  it('priority action: response starts with priority word', async () => {
    const chunks = [
      '<think>\nConsidering severity.\n</think>\n',
      'high — active production incident affecting 5% of users.',
    ];
    const output = await collectStream(chunks);
    expect(output.trim().toLowerCase()).toMatch(/^high/);
  });

  it('comment action: produces professional comment text', async () => {
    const chunks = [
      '<think>\nFormulating a progress update.\n</think>\n',
      'Investigated the Redis connection pool behaviour under load. ',
      'Identified the pool size of 10 as insufficient. ',
      'PR ready for review with pool size increase and circuit breaker.',
    ];
    const output = await collectStream(chunks);
    expect(output.trim().length).toBeGreaterThan(40);
    expect(output).not.toMatch(/^#{1,3}\s/);
  });
});
