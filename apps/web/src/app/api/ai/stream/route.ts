import { NextRequest } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createThinkFilter } from '@/lib/stream-filter';

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'qwen/qwen3-235b-a22b';
const NVIDIA_DEFAULT_API_KEY = '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';

const ACTION_INSTRUCTIONS: Record<string, string> = {
  summary: 'Generate one concise issue summary (3-5 sentences) focused on scope, delivery risks, and intent. Write in plain prose.',
  subtasks: 'Generate 3-6 concrete, actionable implementation subtasks as a numbered list. Each subtask should be one clear sentence.',
  priority: 'Recommend one priority level — low, medium, or high — and explain why in one sentence. Start your response with the priority word.',
  comment: 'Write one professional progress comment suitable for posting on this issue. It should sound like a human engineer wrote it.',
};

const CHANNEL_INSTRUCTIONS: Record<string, string> = {
  default: 'Normal production channel. Prioritize helpfulness and accuracy.',
  smoke_test: 'Smoke test channel. Keep output short and deterministic. Start your response with "[SMOKE]".',
};

function buildSystemPrompt(issue: { title: string; description: string; status: string; priority: string }) {
  return `You are an expert software delivery assistant helping engineering teams manage their work.

Current issue:
Title: ${issue.title || 'Untitled'}
Status: ${issue.status || 'unknown'}
Priority: ${issue.priority || 'unknown'}
Description: ${issue.description || 'No description provided'}

Respond concisely and professionally. Return plain text only — no markdown headers, no bullet symbols, no bold formatting.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: string;
      channel?: string;
      message?: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
    };

    const userApiKey = req.headers.get('x-user-api-key')?.trim();
    const apiKey = userApiKey || process.env.NVIDIA_API_KEY?.trim() || NVIDIA_DEFAULT_API_KEY;

    const model = new ChatOpenAI({
      apiKey,
      model: NVIDIA_MODEL,
      temperature: 0.2,
      maxTokens: 800,
      streaming: true,
      configuration: { baseURL: NVIDIA_BASE_URL },
    });

    const issueContext = {
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      status: String(body.status ?? ''),
      priority: String(body.priority ?? ''),
    };

    const channel = body.channel === 'smoke_test' ? 'smoke_test' : 'default';

    let userMessage: string;
    if (body.action && ACTION_INSTRUCTIONS[body.action]) {
      userMessage = ACTION_INSTRUCTIONS[body.action];
    } else if (body.message?.trim()) {
      userMessage = body.message.trim();
    } else {
      return new Response(JSON.stringify({ error: 'action or message is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const messages = [
      new SystemMessage(`${buildSystemPrompt(issueContext)}\n\nChannel mode:\n${CHANNEL_INSTRUCTIONS[channel]}`),
      new HumanMessage(userMessage),
    ];
    const encoder = new TextEncoder();
    const filter = createThinkFilter();

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            // Client disconnected
          }
        };

        try {
          const langchainStream = await model.stream(messages);

          for await (const chunk of langchainStream) {
            const raw = typeof chunk.content === 'string' ? chunk.content : '';
            if (!raw) continue;

            const text = filter(raw);
            if (text) {
              enqueue(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }

          enqueue('data: [DONE]\n\n');
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error';
          enqueue(`data: ${JSON.stringify({ error: message })}\n\n`);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
