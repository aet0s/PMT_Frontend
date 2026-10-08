import React from 'react';
import LoginForm from '../components/Auth/LoginForm';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export default function LoginPage({ onSwitchToRegister }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-app select-none relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <LoginForm onSwitchToRegister={onSwitchToRegister} />
    </div>
  );
}
