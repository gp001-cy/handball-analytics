import * as Haptics from 'expo-haptics';

type Pulse = 'tap' | 'goal' | 'save' | 'flag' | 'error' | 'drag';

export function pulse(kind: Pulse): void {
  try {
    switch (kind) {
      case 'tap':
        void Haptics.selectionAsync();
        break;
      case 'goal':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'save':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'flag':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'drag':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    // haptics unavailable (web/old device) — non-fatal
  }
}
