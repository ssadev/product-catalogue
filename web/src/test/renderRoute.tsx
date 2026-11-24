import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from '../App';

/** Renders the real app routes at `url`, so links and navigation behave as in the browser. */
export function renderRoute(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  );
}
