import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OpenAIService {

  // default proxy URL (used when no direct API key is provided in environment)
  private readonly proxyUrl = '/api/chat';
  private readonly directUrl = 'https://api.openai.com/v1/chat/completions';

  private readonly systemPrompt = `You are NexaChat, an expert Angular developer assistant. 
You have deep knowledge of Angular, TypeScript, RxJS, Signals 
and modern frontend architecture. Answer concisely with code 
examples. Only answer Angular and frontend related questions.`;

  async *streamChat(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): AsyncGenerator<string, void, unknown> {

    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      ...history,
      { role: 'user' as const, content: userMessage },
    ];
 
    const apiKey = (environment as any).openAIApiKey ?? (environment as any).OPENAI_API_KEY ?? '';
    const useDirect = Boolean(apiKey && apiKey.length > 0);
    const url = useDirect ? this.directUrl : this.proxyUrl;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (useDirect) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model:'llama-3.1-8b-instant',
        messages,
        temperature: 0.2,
        stream: true,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const json = await response.json();
        detail = json?.error?.message ?? JSON.stringify(json);
      } catch {
        try {
          detail = await response.text();
        } catch {
          detail = '';
        }
      }
      throw new Error(`OpenAI request failed (${response.status}) ${detail}`);
    }

    if (!response.body) {
      throw new Error('OpenAI response had no body/stream.');
    }

    yield* this.parseStream(response.body);
  }

  private async *parseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        const payload = trimmed.replace(/^data: /, '');
        try {
          const parsed = JSON.parse(payload);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          // ignore malformed chunks
        }
      }
    }
  }
}