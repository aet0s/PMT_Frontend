import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterForm from '../components/Auth/RegisterForm';
import * as authApi from '../api/auth';
import * as invitationsApi from '../api/invitations';

const mockRegisterUser = vi.fn().mockResolvedValue({ id: 10, name: 'Alice Member' });
const mockNavigate = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    registerUser: mockRegisterUser,
    user: null,
    loading: false
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('Invited Member Registration Flow (Zero OTP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.location;
    window.location = new URL('http://localhost:5173/register?invite_token=test_token_123&email=alice%40acme.com');
  });

  it('renders single-step invitation form without OTP when invite_token is present', async () => {
    vi.spyOn(invitationsApi, 'verifyInvitationToken').mockResolvedValue({
      invitation: {
        id: 1,
        email: 'alice@acme.com',
        workspace_name: 'Acme Product Team',
        role_name: 'Team Member',
        board_names: ['Sprint Board', 'Bug Tracking']
      }
    });

    render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    // Verify Title and Subtitle
    expect(screen.getByText(/accept workspace invitation/i)).toBeDefined();

    // Verify Invitation details card
    await waitFor(() => {
      expect(screen.getAllByText(/acme product team/i).length).toBeGreaterThan(0);
    });

    // Verify email is displayed as verified
    expect(screen.getByText(/email verified via invite link/i)).toBeDefined();
    const emailInput = screen.getByLabelText(/work email/i);
    expect(emailInput.value).toBe('alice@acme.com');
    expect(emailInput.readOnly).toBe(true);

    // Verify NO OTP input is present
    expect(screen.queryByLabelText(/6-digit security code/i)).toBeNull();
    expect(screen.queryByText(/continue to verification/i)).toBeNull();

    // Fill in Name and Password
    const nameInput = screen.getByLabelText(/full name/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm passphrase/i);
    const termsInput = screen.getByRole('checkbox');

    fireEvent.change(nameInput, { target: { value: 'Alice Smith' } });
    fireEvent.change(passwordInput, { target: { value: 'P@ssw0rd123!' } });
    fireEvent.change(confirmInput, { target: { value: 'P@ssw0rd123!' } });
    fireEvent.click(termsInput);

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /accept invitation & join workspace/i });
    fireEvent.click(submitBtn);

    // Ensure registerUser was called without OTP verification token
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith(
        'Alice Smith',
        'alice@acme.com',
        'P@ssw0rd123!',
        'test_token_123',
        undefined,
        undefined
      );
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
