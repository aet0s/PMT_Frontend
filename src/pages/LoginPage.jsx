import React from 'react';
import LoginForm from '../components/Auth/LoginForm';

export default function LoginPage({ onSwitchToRegister }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-app select-none">
      <LoginForm onSwitchToRegister={onSwitchToRegister} />
    </div>
  );
}
