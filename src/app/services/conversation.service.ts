import { Injectable, computed, signal } from '@angular/core';
import { Conversation } from '../conversation.model';
import { ChatMessage } from '../message/message.component';

const STORAGE_KEY = 'nexachat_conversations';
const MAX_CONVERSATIONS = 10;

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  readonly conversations = signal<Conversation[]>([]);
  readonly activeConversationId = signal<string | null>(null);

  readonly getActiveConversation = computed<Conversation | null>(() => {
    const activeId = this.activeConversationId();
    return activeId
      ? this.conversations().find((conversation) => conversation.id === activeId) ?? null
      : null;
  });

  constructor() {
    this.loadFromStorage();
  }

  createNewConversation(): Conversation {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: '',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = [conversation, ...this.conversations()];
    this.conversations.set(this.trimConversations(updated));
    this.activeConversationId.set(conversation.id);
    this.saveToStorage();
    return conversation;
  }

  saveConversation(id: string, messages: ChatMessage[]): void {
    const conversations = this.conversations();
    const index = conversations.findIndex((conversation) => conversation.id === id);
    if (index === -1) {
      return;
    }

    const title = this.getConversationTitle(messages);
    const updatedAt = new Date();
    const updatedConversation: Conversation = {
      ...conversations[index],
      messages,
      title,
      updatedAt,
    };

    const updated = [...conversations];
    updated[index] = updatedConversation;
    this.conversations.set(this.trimConversations(updated));
    this.saveToStorage();
  }

  loadConversation(id: string): ChatMessage[] | null {
    const conversation = this.conversations().find((item) => item.id === id) ?? null;
    if (!conversation) {
      return null;
    }

    this.activeConversationId.set(id);
    return conversation.messages;
  }

  deleteConversation(id: string): void {
    const filtered = this.conversations().filter((conversation) => conversation.id !== id);
    this.conversations.set(filtered);

    if (this.activeConversationId() === id) {
      this.activeConversationId.set(filtered.length > 0 ? filtered[0].id : null);
    }

    this.saveToStorage();
  }

  loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Array<{
        id: string;
        title: string;
        messages: ChatMessage[];
        createdAt: string;
        updatedAt: string;
      }>;

      const conversations = parsed.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));

      this.conversations.set(this.trimConversations(conversations));
      if (conversations.length > 0) {
        this.activeConversationId.set(conversations[0].id);
      }
    } catch {
      this.conversations.set([]);
      this.activeConversationId.set(null);
    }
  }

  private saveToStorage(): void {
    const payload = this.conversations().map((conversation) => ({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  private trimConversations(conversations: Conversation[]): Conversation[] {
    if (conversations.length <= MAX_CONVERSATIONS) {
      return conversations;
    }
    return conversations.slice(0, MAX_CONVERSATIONS);
  }

  private getConversationTitle(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find((message) => message.role === 'user');
    if (!firstUserMessage?.text) {
      return '';
    }

    const trimmed = firstUserMessage.text.trim();
    return trimmed.length <= 30 ? trimmed : `${trimmed.slice(0, 30)}...`;
  }
}
