import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import Badge from '../components/Badge.jsx';
import Pagination from '../components/Pagination.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import api from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    default: { get: vi.fn(), post: vi.fn() },
    setUnauthorizedHandler: vi.fn(),
  };
});

describe('Badge', () => {
  it('shows readable labels for statuses and priorities', () => {
    render(
      <>
        <Badge value="IN_PROGRESS" />
        <Badge value="REJECTED" />
        <Badge value="HIGH" />
      </>,
    );
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('is hidden when everything fits on one page', () => {
    const { container } = render(<Pagination page={1} pageSize={10} total={5} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('moves to the next page', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pageSize={10} total={25} onChange={onChange} />);
    expect(screen.getByText('Page 1 of 3 (25 total)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('LoginPage', () => {
  beforeEach(() => {
    api.get.mockRejectedValue({ response: { status: 401 } });
    api.post.mockReset();
  });

  function renderLogin() {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('shows validation messages without calling the API', async () => {
    renderLogin();
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows the server error for wrong credentials', async () => {
    api.post.mockRejectedValue({ response: { status: 401, data: { error: 'Incorrect email or password.' } } });
    renderLogin();
    await userEvent.type(await screen.findByLabelText('Email'), 'maya@flowops.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'maya@flowops.test', password: 'wrong' });
  });
});
