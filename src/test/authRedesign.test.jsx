import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// Mock useAuth
const mockLoginUser = vi.fn();
const mockVerify2FaLogin = vi.fn();
const mockRegisterUser = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loginUser: mockLoginUser,
    verify2FaLogin: mockVerify2FaLogin,
    registerUser: mockRegisterUser
  })
}));

// Mock API calls
vi.mock('../api/auth', () => ({
  sendRegistrationOtp: vi.fn().mockResolvedValue({ message: 'Code sent' }),
  verifyRegistrationOtp: vi.fn().mockResolvedValue({ verification_token: 'valid-reg-tok-123' }),
  sendForgotPasswordOtp: vi.fn().mockResolvedValue({ message: 'Code sent' }),
  verifyForgotPasswordOtp: vi.fn().mockResolvedValue({ reset_token: 'valid-reset-tok-456' }),
  resetForgotPassword: vi.fn().mockResolvedValue({ message: 'Password reset successfully' }),
  verifyResetToken: vi.fn().mockResolvedValue({ valid: true, email: 'user@company.com' })
}));

describe('Production Authentication Redesign Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginForm', () => {
    it('renders all essential fields, labels, and action controls', () => {
      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      expect(screen.getByLabelText(/work email/i)).toBeDefined();
      expect(screen.getByLabelText(/password/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /sign in to workspace/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /forgot password\?/i })).toBeDefined();
      expect(screen.getByLabelText(/remember my email/i)).toBeDefined();
      expect(screen.getByText(/create organization account/i)).toBeDefined();
    });

    it('toggles password visibility between masked and plaintext', () => {
      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleBtn = screen.getByRole('button', { name: /show visibility/i });

      expect(passwordInput.getAttribute('type')).toBe('password');
      fireEvent.click(toggleBtn);
      expect(passwordInput.getAttribute('type')).toBe('text');
      fireEvent.click(screen.getByRole('button', { name: /hide visibility/i }));
      expect(passwordInput.getAttribute('type')).toBe('password');
    });

    it('submits valid credentials and triggers loginUser', async () => {
      mockLoginUser.mockResolvedValueOnce({ user: { id: 1, name: 'Alice', email: 'alice@company.com' } });

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'alice@company.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

      await waitFor(() => {
        expect(mockLoginUser).toHaveBeenCalledWith('alice@company.com', 'Password123!', undefined);
      });
    });

    it('displays actionable error message when server rejects credentials', async () => {
      mockLoginUser.mockRejectedValueOnce(new Error('Invalid email or password.'));

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'wrong@company.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'WrongPass!' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText(/invalid email or password/i)).toBeDefined();
      });
    });

    it('handles account lockout response with remaining lockout duration', async () => {
      const lockoutErr = new Error('Invalid email or password');
      lockoutErr.remaining_minutes = 15;
      mockLoginUser.mockRejectedValueOnce(lockoutErr);

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'locked@company.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'WrongPass!' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

      await waitFor(() => {
        expect(screen.getByText(/temporarily locked.*15 minute/i)).toBeDefined();
      });
    });

    it('transitions to 2FA challenge when user has TOTP enabled', async () => {
      mockLoginUser.mockResolvedValueOnce({ requires_2fa: true, temp_token: 'mock-temp-2fa-token' });
      mockVerify2FaLogin.mockResolvedValueOnce({ user: { id: 1, name: 'Alice' } });

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'alice@company.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in to workspace/i }));

      await waitFor(() => {
        expect(screen.getByText(/two-factor verification/i)).toBeDefined();
        expect(screen.getByLabelText(/6-digit security code/i)).toBeDefined();
      });

      fireEvent.change(screen.getByLabelText(/6-digit security code/i), { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /verify & launch workspace/i }));

      await waitFor(() => {
        expect(mockVerify2FaLogin).toHaveBeenCalledWith('mock-temp-2fa-token', '123456');
      });
    });
  });

  describe('RegisterForm', () => {
    it('renders initial Step 1 fields and step indicator', () => {
      render(
        <BrowserRouter>
          <RegisterForm />
        </BrowserRouter>
      );

      expect(screen.getByLabelText(/full name/i)).toBeDefined();
      expect(screen.getByLabelText(/work email/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /continue to verification/i })).toBeDefined();
    });

    it('progresses through 3-step registration: details -> OTP -> password validation', async () => {
      render(
        <BrowserRouter>
          <RegisterForm />
        </BrowserRouter>
      );

      // Step 1: Enter details and dispatch OTP
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bob Smith' } });
      fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'bob@company.com' } });
      fireEvent.click(screen.getByRole('button', { name: /continue to verification/i }));

      // Step 2: Enter OTP
      await waitFor(() => {
        expect(screen.getByText(/verify your work email/i)).toBeDefined();
        expect(screen.getByLabelText(/6-digit security code/i)).toBeDefined();
      });

      fireEvent.change(screen.getByLabelText(/6-digit security code/i), { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /verify code/i }));

      // Step 3: Set Password & Validate Mismatch
      await waitFor(() => {
        expect(screen.getByText(/set account password/i)).toBeDefined();
        expect(screen.getByLabelText(/^password/i)).toBeDefined();
        expect(screen.getByLabelText(/confirm passphrase/i)).toBeDefined();
      });

      fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'StrongPass123!' } });
      fireEvent.change(screen.getByLabelText(/confirm passphrase/i), { target: { value: 'Mismatch999!' } });
      fireEvent.click(screen.getByLabelText(/terms of service/i));

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/passwords do not match/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('ForgotPasswordPage', () => {
    it('dispatches reset code and transitions to verification step', async () => {
      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );

      expect(screen.getByLabelText(/registered work email/i)).toBeDefined();

      fireEvent.change(screen.getByLabelText(/registered work email/i), { target: { value: 'alice@company.com' } });
      fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));

      await waitFor(() => {
        expect(screen.getByText(/enter security code/i)).toBeDefined();
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeDefined();
      });
    });
  });

  describe('ResetPasswordPage', () => {
    it('renders validation state when missing token', () => {
      render(
        <BrowserRouter>
          <ResetPasswordPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/no reset token provided/i)).toBeDefined();
    });
  });
});
