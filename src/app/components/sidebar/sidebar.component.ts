import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { ConversationService } from '../../services/conversation.service';
import { ChatMessage } from '../../message/message.component';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <aside class="h-full w-full max-w-xs min-w-[220px] bg-slate-950 text-slate-100 shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <h2 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
  Chats
</h2>
        <button
          type="button"
          (click)="handleNewChat()"
          class="rounded bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-slate-700"
        >
          New Chat
        </button>
      </div>

      <nav class="overflow-y-auto px-2 py-3">
        <ul class="space-y-2">
         <li
  *ngFor="let conversation of conversationService.conversations()"
  class="rounded-lg"
>
  <div
    class="flex items-center justify-between rounded-lg px-3 py-3 transition hover:bg-slate-800"
    [class.bg-slate-800]="conversation.id === conversationService.activeConversationId()"
  >
    <button
      type="button"
      class="flex-1 text-left text-sm leading-5 text-slate-100 min-w-0"
      (click)="selectConversation(conversation.id)"
    >
      <span class="block text-sm font-medium text-slate-100 break-words whitespace-normal">
        {{ conversation.title || 'New Conversation' }}
      </span>
      <span class="mt-1 block text-xs text-slate-500">
        {{ conversation.messages.length }} message{{ conversation.messages.length === 1 ? '' : 's' }}
      </span>
    </button>

    <button
      type="button"
      (click)="deleteConversation(conversation.id); $event.stopPropagation()"
      class="ml-2 shrink-0 rounded p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-red-400"
      aria-label="Delete conversation"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  </div>
</li>
        </ul>
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
    readonly conversationService = inject(ConversationService);

    @Output() readonly conversationSelected = new EventEmitter<ChatMessage[]>();
    @Output() readonly newChatStarted = new EventEmitter<void>();
    @Output() readonly conversationDeleted = new EventEmitter<void>();

    handleNewChat(): void {
        this.conversationService.createNewConversation();
        this.newChatStarted.emit();
    }

    selectConversation(id: string): void {
        const messages = this.conversationService.loadConversation(id);
        if (messages) {
            this.conversationSelected.emit(messages);
        }
    }

    deleteConversation(id: string): void {
        this.conversationService.deleteConversation(id);
        this.conversationDeleted.emit();
    }
}
