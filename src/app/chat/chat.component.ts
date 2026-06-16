import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageComponent, ChatMessage } from '../message/message.component';
import { OpenAIService } from '../services/openai.service';
import { ConversationService } from '../services/conversation.service';
import { SidebarComponent } from '../components/sidebar/sidebar.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, MessageComponent, SidebarComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  private readonly openAI = inject(OpenAIService);
  private readonly conversationService = inject(ConversationService);
  public sidebarOpen = signal(false);
  @ViewChild('scrollBottom') private scrollBottom!: ElementRef;

  ngAfterViewChecked() {
    this.scrollBottom?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Welcome to NexaChat. Ask your Angular developer question and the AI will answer with streaming output.',
    },
  ]);
  userInput = signal('');
  isLoading = signal(false);
  currentConversationId = signal<string | null>(null);

  async sendMessage() {
    const prompt = this.userInput().trim();
    if (!prompt || this.isLoading()) {
      return;
    }

    if (!this.currentConversationId()) {
      const conversation = this.conversationService.createNewConversation();
      this.currentConversationId.set(conversation.id);
    }

    const conversationId = this.currentConversationId();
    if (!conversationId) {
      return;
    }

    // Add user message to history
    this.messages.update((current) => [...current, { role: 'user', text: prompt }]);
    this.userInput.set('');
    this.isLoading.set(true);

    // Add empty assistant message placeholder
    this.messages.update((current) => [...current, { role: 'assistant', text: '' }]);

    try {
      // Build history from all messages except the empty assistant placeholder
      const history = this.messages().slice(0, -1).slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.text,
      }));

      // Stream response from OpenAI
      for await (const token of this.openAI.streamChat(prompt, history)) {
        this.messages.update((current) => {
          const last = current[current.length - 1];
          if (!last || last.role !== 'assistant') {
            return current;
          }

          const updated = { ...last, text: last.text + token };
          const next = [...current.slice(0, -1), updated];
          return next;
        });
      }
      this.conversationService.saveConversation(conversationId, this.messages());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI request failed.';
      const errorText = `Error: ${message}`;
      console.error('OpenAI stream error:', error);

      // Replace empty assistant placeholder with error
      this.messages.update((current) => {
        const last = current[current.length - 1];
        if (last && last.role === 'assistant' && last.text.trim() === '') {
          return [...current.slice(0, -1), { ...last, text: errorText }];
        }
        return current;
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onConversationSelected(messages: ChatMessage[]): void {
    this.messages.set(messages);
    this.currentConversationId.set(this.conversationService.activeConversationId());
  }

  onNewChatStarted(): void {
    this.messages.set([
      {
        role: 'assistant',
        text: 'Welcome to NexaChat. Ask your Angular developer question and the AI will answer with streaming output.',
      },
    ]);
    this.currentConversationId.set(this.conversationService.getActiveConversation()?.id ?? null);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else if (event.key === 'Enter' && event.shiftKey) {
      // Allow natural new line behavior for Shift+Enter
      // The textarea will handle this by default
    }
  }

  onConversationDeleted(): void {
  const active = this.conversationService.getActiveConversation();
  if (active) {
    // Load the first remaining conversation
    this.messages.set(active.messages);
    this.currentConversationId.set(active.id);
  } else {
    // No conversations left — show welcome screen
    this.messages.set([{
      role: 'assistant',
      text: 'Welcome to NexaChat. Ask your Angular developer question and the AI will answer with streaming output.',
    }]);
    this.currentConversationId.set(null);
  }
}
}
