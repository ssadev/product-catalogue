import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SearchBar } from './SearchBar';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <SearchBar />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SearchBar', () => {
  it('disables the Search button until a non-blank term is entered', async () => {
    renderAt('/');
    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByRole('searchbox'), '   ');
    expect(button).toBeDisabled();
  });

  it('navigates to the results page with the trimmed term on click', async () => {
    renderAt('/');
    await userEvent.type(screen.getByRole('searchbox'), ' jacket ');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=jacket');
  });

  it('submits on Enter', async () => {
    renderAt('/');
    await userEvent.type(screen.getByRole('searchbox'), 'bag{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=bag');
  });

  it('shows the current term when on the results page', () => {
    renderAt('/search?q=bag');
    expect(screen.getByRole('searchbox')).toHaveValue('bag');
  });
});
