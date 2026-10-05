import { describe, it, expect } from 'vitest';
import { validateNextRedirect } from '../lib/safeRedirect';

describe('validateNextRedirect', () => {
  it('allows safe relative paths', () => {
    expect(validateNextRedirect('/w/123/home')).toBe('/w/123/home');
    expect(validateNextRedirect('/w/123/p/456/board?card=789')).toBe('/w/123/p/456/board?card=789');
    expect(validateNextRedirect('/account/profile')).toBe('/account/profile');
  });

  it('rejects empty, null or non-string inputs', () => {
    expect(validateNextRedirect('')).toBe('/');
    expect(validateNextRedirect(null)).toBe('/');
    expect(validateNextRedirect(undefined)).toBe('/');
    expect(validateNextRedirect(12345)).toBe('/');
    expect(validateNextRedirect('', '/fallback')).toBe('/fallback');
  });

  it('rejects protocol-relative URLs (//evil.com)', () => {
    expect(validateNextRedirect('//evil.com')).toBe('/');
    expect(validateNextRedirect('///evil.com')).toBe('/');
    expect(validateNextRedirect('//google.com/test')).toBe('/');
  });

  it('rejects absolute URLs with http/https schemes', () => {
    expect(validateNextRedirect('https://evil.com')).toBe('/');
    expect(validateNextRedirect('http://evil.com/w/1')).toBe('/');
  });

  it('rejects backslash bypasses (\\ and /\\)', () => {
    expect(validateNextRedirect('/\\evil.com')).toBe('/');
    expect(validateNextRedirect('\\evil.com')).toBe('/');
    expect(validateNextRedirect('/path\\extra')).toBe('/');
  });

  it('rejects javascript: and other pseudo-protocol URLs', () => {
    expect(validateNextRedirect('javascript:alert(1)')).toBe('/');
    expect(validateNextRedirect('/javascript:alert(1)')).toBe('/');
    expect(validateNextRedirect('data:text/html,evil')).toBe('/');
  });

  it('preserves query params and hashes on safe paths', () => {
    expect(validateNextRedirect('/w/10/p/20?card=5#checklist')).toBe('/w/10/p/20?card=5#checklist');
  });
});
