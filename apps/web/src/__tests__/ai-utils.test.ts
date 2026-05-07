import { describe, it, expect } from 'vitest';
import { normalizeSuggestions, pickApiKey } from '@/lib/ai';

const TEST_NVIDIA_KEY = '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';
const DEFAULT_KEY = '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';

// ─── normalizeSuggestions ────────────────────────────────────────────────────

describe('normalizeSuggestions', () => {
  it('returns single-element array for summary action', () => {
    const result = normalizeSuggestions('This is the summary text.', 'summary');
    expect(result).toEqual(['This is the summary text.']);
  });

  it('returns single-element array for priority action', () => {
    const result = normalizeSuggestions('high — needs immediate attention', 'priority');
    expect(result).toEqual(['high — needs immediate attention']);
  });

  it('returns single-element array for comment action', () => {
    const result = normalizeSuggestions('Investigation complete, PR ready for review.', 'comment');
    expect(result).toEqual(['Investigation complete, PR ready for review.']);
  });

  it('splits numbered list into separate subtasks', () => {
    const text = '1. Write unit tests\n2. Add integration tests\n3. Update documentation';
    const result = normalizeSuggestions(text, 'subtasks');
    expect(result).toEqual(['Write unit tests', 'Add integration tests', 'Update documentation']);
  });

  it('handles subtasks with period-separated numbers', () => {
    const text = '1. First task\n2. Second task\n3. Third task';
    const result = normalizeSuggestions(text, 'subtasks');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('First task');
  });

  it('handles subtasks with parenthesis-separated numbers', () => {
    const text = '1) Task A\n2) Task B\n3) Task C';
    const result = normalizeSuggestions(text, 'subtasks');
    expect(result).toEqual(['Task A', 'Task B', 'Task C']);
  });

  it('caps subtasks at 6 items', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `${i + 1}. Task ${i + 1}`).join('\n');
    const result = normalizeSuggestions(lines, 'subtasks');
    expect(result).toHaveLength(6);
  });

  it('falls back to single item when subtasks text is not a list', () => {
    const text = 'Please implement everything.';
    const result = normalizeSuggestions(text, 'subtasks');
    expect(result).toEqual(['Please implement everything.']);
  });

  it('filters blank lines in subtask list', () => {
    const text = '1. First\n\n2. Second\n\n3. Third';
    const result = normalizeSuggestions(text, 'subtasks');
    expect(result).toEqual(['First', 'Second', 'Third']);
  });

  it('trims whitespace from all action types', () => {
    expect(normalizeSuggestions('  trimmed  ', 'summary')).toEqual(['trimmed']);
    expect(normalizeSuggestions('  trimmed  ', 'priority')).toEqual(['trimmed']);
    expect(normalizeSuggestions('  trimmed  ', 'comment')).toEqual(['trimmed']);
  });
});

// ─── pickApiKey ──────────────────────────────────────────────────────────────

describe('pickApiKey', () => {
  const originalEnv = process.env.NVIDIA_API_KEY;

  afterEach(() => {
    // Restore env after each test that modifies it
    if (originalEnv === undefined) {
      delete process.env.NVIDIA_API_KEY;
    } else {
      process.env.NVIDIA_API_KEY = originalEnv;
    }
  });

  it('returns user-provided key when supplied', () => {
    process.env.NVIDIA_API_KEY = 'env-key';
    expect(pickApiKey(TEST_NVIDIA_KEY)).toBe(TEST_NVIDIA_KEY);
  });

  it('falls back to env NVIDIA_API_KEY when no user key', () => {
    process.env.NVIDIA_API_KEY = 'env-key-123';
    expect(pickApiKey(undefined)).toBe('env-key-123');
  });

  it('falls back to env key when user provides empty string', () => {
    process.env.NVIDIA_API_KEY = 'env-key-456';
    expect(pickApiKey('   ')).toBe('env-key-456');
  });

  it('falls back to hardcoded default when no user key and no env key', () => {
    delete process.env.NVIDIA_API_KEY;
    const key = pickApiKey(undefined);
    expect(key).toBe(DEFAULT_KEY);
  });

  it('user key takes priority over both env and default', () => {
    process.env.NVIDIA_API_KEY = 'env-key';
    const key = pickApiKey(TEST_NVIDIA_KEY);
    expect(key).toBe(TEST_NVIDIA_KEY);
    expect(key).not.toBe('env-key');
    expect(key).not.toBe(DEFAULT_KEY);
  });
});
