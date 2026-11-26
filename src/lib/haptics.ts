const STORAGE_KEY = 'lorewalk.vibration'

export function isVibrationEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'off'
}

export function setVibrationEnabled(on: boolean) {
  localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
}

// navigator.vibrate exists in Chrome on Android. iOS Safari has no vibrate, so it does nothing there.
export function vibrate(pattern: number | number[]) {
  if (!isVibrationEnabled() || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}
