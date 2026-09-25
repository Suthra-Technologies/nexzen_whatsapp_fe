/**
 * Notification Service
 * 
 * Provides:
 * 1. Web Audio API synthesized notification chimes (offline-capable, zero external asset dependencies).
 * 2. HTML5 Browser Desktop Notifications with one-click permission request and conversation routing.
 * 3. Sound preference persistence in localStorage.
 */

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private readonly SOUND_PREF_KEY = 'nexzen_notif_sound_enabled';

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.SOUND_PREF_KEY);
      this.soundEnabled = saved !== null ? saved === 'true' : true;
    }
  }

  /**
   * Initializes or resumes the Web Audio Context.
   * Browsers require user interaction before playing audio.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Returns whether notification sounds are currently enabled.
   */
  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Sets whether notification sounds are enabled and persists to localStorage.
   */
  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SOUND_PREF_KEY, String(enabled));
    }
  }

  /**
   * Plays a pleasant, WhatsApp-style dual-tone chime using Web Audio API.
   * Tone 1: 587.33 Hz (D5) -> Tone 2: 880 Hz (A5).
   */
  /**
   * Plays a loud, crisp, and pleasant dual-tone chime using Web Audio API.
   * Includes dynamics compression to maximize loudness without clipping or distortion.
   */
  public playNotificationSound(volumeMultiplier: number = 1.0): void {
    if (!this.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Dynamics Compressor to maximize loudness and prevent clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, now);
      compressor.knee.setValueAtTime(20, now);
      compressor.ratio.setValueAtTime(8, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.15, now);
      compressor.connect(ctx.destination);

      // Master gain node (loud and clear)
      const masterGain = ctx.createGain();
      const vol = Math.min(1.0, Math.max(0.1, 0.9 * volumeMultiplier));
      masterGain.gain.setValueAtTime(vol, now);
      masterGain.connect(compressor);

      // --- Primary Bell Note 1: E5 (659.25 Hz) ---
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.85, now + 0.025);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // --- Primary Bell Note 2: B5 (987.77 Hz) - Bright, uplifting finish ---
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.11);

      gain2.gain.setValueAtTime(0.001, now + 0.11);
      gain2.gain.exponentialRampToValueAtTime(0.95, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.11);
      osc2.stop(now + 0.58);

      // --- High overtone sparkle: E6 (1318.5 Hz) for crisp acoustic presence ---
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1318.51, now + 0.12);

      gain3.gain.setValueAtTime(0.001, now + 0.12);
      gain3.gain.exponentialRampToValueAtTime(0.3, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.12);
      osc3.stop(now + 0.48);
    } catch (e) {
      console.warn('[NotificationService] Audio playback failed:', e);
    }
  }

  /**
   * Checks current browser desktop notification permission status.
   */
  public getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Requests permission to display browser desktop notifications.
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.error('[NotificationService] Notification permission request error:', e);
      return 'denied';
    }
  }

  /**
   * Displays an HTML5 Desktop Push Notification.
   */
  public showDesktopNotification(options: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }): Notification | null {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }
    if (Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notifOpts: any = {
        body: options.body,
        icon: options.icon || '/32.png',
        tag: options.tag || 'nexzen_message',
        renotify: true,
        silent: true // We control our own pleasant Web Audio sound
      };
      const notif = new Notification(options.title, notifOpts);

      notif.onclick = () => {
        window.focus();
        if (options.onClick) {
          options.onClick();
        }
        notif.close();
      };

      // Auto close after 6 seconds to prevent screen clutter
      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, 6000);

      return notif;
    } catch (e) {
      console.warn('[NotificationService] Failed to display desktop notification:', e);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
