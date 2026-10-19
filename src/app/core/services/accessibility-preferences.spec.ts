import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AccessibilityPreferences } from './accessibility-preferences';

const STORAGE_KEY = 'brasil-decide-2026.accessibility.v1';

describe('AccessibilityPreferences', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  it('applies and persists the text scale and contrast settings', () => {
    const preferences = TestBed.inject(AccessibilityPreferences);

    preferences.setFontScale('extra-large');
    preferences.setHighContrast(true);

    expect(document.documentElement.dataset['fontScale']).toBe('extra-large');
    expect(document.documentElement.dataset['highContrast']).toBe('true');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      fontScale: 'extra-large',
      highContrast: true,
    });
  });

  it('restores saved preferences when the service is created again', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fontScale: 'large', highContrast: true, soundAlerts: true }),
    );

    const preferences = TestBed.inject(AccessibilityPreferences);

    expect(preferences.fontScale()).toBe('large');
    expect(preferences.highContrast()).toBe(true);
    expect(preferences.soundAlerts()).toBe(true);
  });
});
