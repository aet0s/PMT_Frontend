import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import SecurityTab from '../pages/account/tabs/SecurityTab';

// Mock Auth Context
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com', two_factor_enabled: false },
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    updateUserPassword: vi.fn(),
    refreshUser: vi.fn()
  })
}));

// Mock Toast Context
vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({
    show: vi.fn()
  })
}));

describe('K-A.5: Password inputs wrapped in form with autocomplete attributes', () => {
  it('LoginForm password input is inside a form with current-password autocomplete', () => {
    render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeDefined();
    expect(passwordInput.getAttribute('type')).toBe('password');
    expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
    expect(passwordInput.closest('form')).not.toBeNull();
  });

  it('RegisterForm password input is inside a form with new-password autocomplete', () => {
    render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeDefined();
    expect(passwordInput.getAttribute('type')).toBe('password');
    expect(passwordInput.getAttribute('autocomplete')).toBe('new-password');
    expect(passwordInput.closest('form')).not.toBeNull();
  });

  it('SecurityTab password inputs are wrapped in form with correct autocompletes', () => {
    render(<SecurityTab />);

    const currentPwdInput = screen.getByLabelText(/current password/i);
    expect(currentPwdInput.getAttribute('autocomplete')).toBe('current-password');
    expect(currentPwdInput.closest('form')).not.toBeNull();

    const newPwdInput = screen.getByLabelText(/^new password/i);
    expect(newPwdInput.getAttribute('autocomplete')).toBe('new-password');
    expect(newPwdInput.closest('form')).not.toBeNull();

    const confirmPwdInput = screen.getByLabelText(/confirm new password/i);
    expect(confirmPwdInput.getAttribute('autocomplete')).toBe('new-password');
    expect(confirmPwdInput.closest('form')).not.toBeNull();
  });
});
