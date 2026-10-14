// client/src/test/welcomeGreeting.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkspaceHomePage from '../pages/WorkspaceHomePage';
import { getTimeBasedGreeting, getISTHour } from '../lib/serverTime';

describe('Verify Time-Based Welcome Message (IST Server Time)', () => {
  describe('getTimeBasedGreeting unit tests', () => {
    it('returns "Good Morning" during morning hours in IST (00:00 - 11:59)', () => {
      // 05:30 IST = 00:00 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T00:00:00Z'))).toBe('Good Morning');
      // 09:00 IST = 03:30 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T03:30:00Z'))).toBe('Good Morning');
      // 11:59:59 IST = 06:29:59 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T06:29:59Z'))).toBe('Good Morning');
    });

    it('returns "Good Afternoon" during afternoon hours in IST (12:00 - 16:59)', () => {
      // 12:00:00 IST = 06:30:00 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T06:30:00Z'))).toBe('Good Afternoon');
      // 14:30:00 IST = 09:00:00 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T09:00:00Z'))).toBe('Good Afternoon');
      // 16:59:59 IST = 11:29:59 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T11:29:59Z'))).toBe('Good Afternoon');
    });

    it('returns "Good Evening" during evening hours in IST (17:00 - 23:59)', () => {
      // 17:00:00 IST = 11:30:00 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T11:30:00Z'))).toBe('Good Evening');
      // 20:00:00 IST = 14:30:00 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T14:30:00Z'))).toBe('Good Evening');
      // 23:59:59 IST = 18:29:59 UTC
      expect(getTimeBasedGreeting(new Date('2026-10-09T18:29:59Z'))).toBe('Good Evening');
    });

    it('evaluates IST time accurately even if local machine runs in a different timezone', () => {
      // At 09:00 AM in IST (03:30 UTC), a machine in Tokyo/Singapore would have local hours 11:30 or 12:30 (afternoon).
      // Regardless of client machine timezone, IST must resolve to 9 AM -> "Good Morning".
      const morningDate = new Date('2026-10-09T03:30:00Z');
      expect(getISTHour(morningDate)).toBe(9);
      expect(getTimeBasedGreeting(morningDate)).toBe('Good Morning');
    });
  });

  describe('WorkspaceHomePage Welcome Banner Greeting Rendering', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('displays "Good Morning, Hardik!" when IST time is 09:00 AM', () => {
      // Set fake system time to 09:00 AM IST (03:30 UTC)
      vi.setSystemTime(new Date('2026-10-09T03:30:00Z'));

      const mockWorkspace = { id: 1, name: 'Personal Project' };
      const mockUser = { id: 1, name: 'Hardik' };

      render(
        <MemoryRouter initialEntries={['/w/1']}>
          <Routes>
            <Route
              path="/w/:workspaceId"
              element={<WorkspaceHomePage workspace={mockWorkspace} boards={[]} user={mockUser} />}
            />
          </Routes>
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Good Morning, Hardik!');
    });

    it('displays "Good Afternoon, Hardik!" when IST time is 02:00 PM', () => {
      // Set fake system time to 02:00 PM IST (08:30 UTC)
      vi.setSystemTime(new Date('2026-10-09T08:30:00Z'));

      const mockWorkspace = { id: 1, name: 'Personal Project' };
      const mockUser = { id: 1, name: 'Hardik' };

      render(
        <MemoryRouter initialEntries={['/w/1']}>
          <Routes>
            <Route
              path="/w/:workspaceId"
              element={<WorkspaceHomePage workspace={mockWorkspace} boards={[]} user={mockUser} />}
            />
          </Routes>
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Good Afternoon, Hardik!');
    });

    it('displays "Good Evening, Hardik!" when IST time is 07:00 PM', () => {
      // Set fake system time to 07:00 PM IST (13:30 UTC)
      vi.setSystemTime(new Date('2026-10-09T13:30:00Z'));

      const mockWorkspace = { id: 1, name: 'Personal Project' };
      const mockUser = { id: 1, name: 'Hardik' };

      render(
        <MemoryRouter initialEntries={['/w/1']}>
          <Routes>
            <Route
              path="/w/:workspaceId"
              element={<WorkspaceHomePage workspace={mockWorkspace} boards={[]} user={mockUser} />}
            />
          </Routes>
        </MemoryRouter>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Good Evening, Hardik!');
    });
  });
});
