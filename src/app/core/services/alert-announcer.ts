import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { AccessibilityPreferences } from './accessibility-preferences';

@Injectable({ providedIn: 'root' })
export class AlertAnnouncer {
  private readonly document = inject(DOCUMENT);
  private readonly preferences = inject(AccessibilityPreferences);

  repeat(message: string): string {
    if (!this.preferences.soundAlerts()) {
      return 'Ative os avisos sonoros em Ajuda para ouvir este aviso.';
    }

    const view = this.document.defaultView;

    if (!view?.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      return 'A leitura de voz não está disponível neste navegador.';
    }

    view.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'pt-BR';
    view.speechSynthesis.speak(utterance);

    return 'Reproduzindo o aviso em voz alta.';
  }
}
