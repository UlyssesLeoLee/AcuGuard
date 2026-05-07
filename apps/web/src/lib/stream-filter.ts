/**
 * Filters <think>...</think> blocks from LLM streaming output.
 * Returns a stateful function that processes chunks incrementally,
 * emitting only content outside think tags.
 */
export function createThinkFilter() {
  let buffer = '';
  let inThink = false;

  return function filter(chunk: string): string {
    buffer += chunk;
    let output = '';

    while (buffer.length > 0) {
      if (!inThink) {
        const thinkIdx = buffer.indexOf('<think>');
        if (thinkIdx === -1) {
          const tag = '<think>';
          let safeLen = buffer.length;
          for (let i = 1; i < tag.length; i++) {
            if (buffer.endsWith(tag.slice(0, i))) {
              safeLen = buffer.length - i;
              break;
            }
          }
          output += buffer.slice(0, safeLen);
          buffer = buffer.slice(safeLen);
          break;
        } else {
          output += buffer.slice(0, thinkIdx);
          buffer = buffer.slice(thinkIdx + '<think>'.length);
          inThink = true;
        }
      } else {
        const endIdx = buffer.indexOf('</think>');
        if (endIdx === -1) {
          const tag = '</think>';
          let safeDiscardLen = buffer.length;
          for (let i = 1; i < tag.length; i++) {
            if (buffer.endsWith(tag.slice(0, i))) {
              safeDiscardLen = buffer.length - i;
              break;
            }
          }
          buffer = buffer.slice(safeDiscardLen);
          break;
        } else {
          buffer = buffer.slice(endIdx + '</think>'.length);
          inThink = false;
        }
      }
    }

    return output;
  };
}
