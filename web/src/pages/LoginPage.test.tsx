import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthState } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';

function renderLogin(overrides: Partial<AuthState> = {}) {
  const auth: AuthState = {
    roles: [],
    isAuthenticated: false,
    isRestoring: false,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return auth;
}

describe('LoginPage', () => {
  it('renders the fields and controls from the specification', () => {
    renderLogin();
    expect(screen.getByLabelText('Email Address or Member Alias')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot Password' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('submits the identifier and password', async () => {
    const auth = renderLogin();
    await userEvent.type(screen.getByLabelText('Email Address or Member Alias'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'Woodcarver!2026');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(auth.login).toHaveBeenCalledWith('admin', 'Woodcarver!2026');
  });

  it('shows the failure reason when sign in is rejected', async () => {
    renderLogin({ login: vi.fn().mockRejectedValue(new Error('nope')) });
    await userEvent.type(screen.getByLabelText('Email Address or Member Alias'), 'admin');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in');
  });
});
