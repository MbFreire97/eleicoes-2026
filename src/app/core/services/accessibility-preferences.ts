import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type FontScale = 'normal' | 'large' | 'extra-large';

interface StoredPreferences {
  readonly fontScale: FontScale;
  readonly highContrast: boolean;
  readonly soundAlerts: boolean;
}

const STORAGE_KEY = 'brasil-decide-2026.accessibility.v1';
const DEFAULT_PREFERENCES: StoredPreferences = {
  fontScale: 'normal',
  highContrast: false,
  soundAlerts: false,
};

function isFontScale(value: unknown): value is FontScale {
  return value === 'normal' || value === 'large' || value === 'extra-large';
}

@Injectable({ providedIn: 'root' })
export class AccessibilityPreferences {
  private readonly document = inject(DOCUMENT);

  readonly fontScale = signal<FontScale>('normal');
  readonly highContrast = signal(false);
  readonly soundAlerts = signal(false);

  constructor() {
    const stored = this.readStoredPreferences();
    this.fontScale.set(stored.fontScale);
    this.highContrast.set(stored.highContrast);
    this.soundAlerts.set(stored.soundAlerts);
    this.applyPreferences();
  }

  setFontScale(value: FontScale): void {
    this.fontScale.set(value);
    this.saveAndApply();
  }

  setHighContrast(value: boolean): void {
    this.highContrast.set(value);
    this.saveAndApply();
  }

  setSoundAlerts(value: boolean): void {
    this.soundAlerts.set(value);
    this.saveAndApply();
  }

  private readStoredPreferences(): StoredPreferences {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;

      if (typeof parsed !== 'object' || parsed === null) {
        return DEFAULT_PREFERENCES;
      }

      const record = parsed as Record<string, unknown>;
      return {
        fontScale: isFontScale(record['fontScale']) ? record['fontScale'] : 'normal',
        highContrast: record['highContrast'] === true,
        soundAlerts: record['soundAlerts'] === true,
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  private saveAndApply(): void {
    this.applyPreferences();

    try {
      const preferences: StoredPreferences = {
        fontScale: this.fontScale(),
        highContrast: this.highContrast(),
        soundAlerts: this.soundAlerts(),
      };
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // The controls remain active for this session when storage is unavailable.
    }
  }

  private applyPreferences(): void {
    const root = this.document.documentElement;
    root.dataset['fontScale'] = this.fontScale();
    root.dataset['highContrast'] = String(this.highContrast());
  }
}
