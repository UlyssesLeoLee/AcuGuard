import { describe, it, expect } from 'vitest';
import { createThinkFilter } from '@/lib/stream-filter';

describe('createThinkFilter', () => {
  it('passes through plain text unchanged', () => {
    const filter = createThinkFilter();
    expect(filter('Hello world')).toBe('Hello world');
  });

  it('strips a complete <think>...</think> block in one chunk', () => {
    const filter = createThinkFilter();
    const result = filter('Before<think>internal reasoning</think>After');
    expect(result).toBe('BeforeAfter');
  });

  it('strips a think block split across multiple chunks', () => {
    const filter = createThinkFilter();
    expect(filter('Before<th')).toBe('Before');
    expect(filter('ink>reasoning</th')).toBe('');
    expect(filter('ink>After')).toBe('After');
  });

  it('handles think block that opens in one chunk and closes in a later chunk', () => {
    const filter = createThinkFilter();
    expect(filter('Text<think>')).toBe('Text');
    expect(filter('hidden content')).toBe('');
    expect(filter('more hidden</think>visible')).toBe('visible');
  });

  it('emits nothing when entire chunk is inside think block', () => {
    const filter = createThinkFilter();
    expect(filter('<think>all hidden</think>')).toBe('');
  });

  it('handles multiple think blocks in sequence', () => {
    const filter = createThinkFilter();
    const result = filter('<think>a</think>mid<think>b</think>end');
    expect(result).toBe('midend');
  });

  it('preserves text that looks like a partial think tag at chunk boundary', () => {
    const filter = createThinkFilter();
    // "<thi" at end of chunk — could be start of <think>, hold it back
    const first = filter('Hello <thi');
    // The partial tag is held in buffer, not emitted yet
    expect(first).toBe('Hello ');
    // Next chunk completes the word as something else — emit held + rest
    const second = filter('ngs are good');
    expect(second).toBe('<thi' + 'ngs are good');
  });

  it('handles empty string chunk gracefully', () => {
    const filter = createThinkFilter();
    expect(filter('')).toBe('');
    expect(filter('text')).toBe('text');
  });

  it('each filter instance has independent state', () => {
    const filterA = createThinkFilter();
    const filterB = createThinkFilter();

    filterA('<think>');
    expect(filterA('hidden')).toBe('');
    expect(filterB('visible')).toBe('visible');
  });

  it('handles text immediately after closing think tag', () => {
    const filter = createThinkFilter();
    expect(filter('<think>hidden</think>immediate')).toBe('immediate');
  });

  it('handles no think tags — full content passes through across chunks', () => {
    const filter = createThinkFilter();
    const chunks = ['Hello ', 'world. ', 'This is ', 'plain text.'];
    const output = chunks.map((c) => filter(c)).join('');
    expect(output).toBe('Hello world. This is plain text.');
  });
});
