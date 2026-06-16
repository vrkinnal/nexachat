import { render } from '@testing-library/angular';
import { ChatComponent } from './chat.component';

describe('ChatComponent', () => {
  it('should render the chat header', async () => {
    const { getByText } = await render(ChatComponent);

    expect(getByText('AI Developer Assistant Chat')).toBeTruthy();
  });
});
