import React from 'react';
import RegisterForm from '../components/Auth/RegisterForm';

export default function RegisterPage({ onSwitchToLogin }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-app select-none">
      <RegisterForm onSwitchToLogin={onSwitchToLogin} />
    </div>
  );
}
