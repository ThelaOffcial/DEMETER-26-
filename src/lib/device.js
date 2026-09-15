export function getDeviceId() {
  let id = localStorage.getItem('demeter_device_id')
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : 'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2)
    localStorage.setItem('demeter_device_id', id)
  }
  return id
}

export function getFingerprint() {
  const s = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|')
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0
  }
  return 'fp' + Math.abs(hash)
}

export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function describeViolation(type) {
  const map = {
    'tab-switch': 'you switched tabs or hid the window',
    'window-blur': 'the window lost focus',
    'fullscreen-exit': 'you left full screen',
    'fullscreen-exit-timeout': 'you did not return to full screen in time',
    'blocked-key': 'a restricted key combination was pressed',
    printscreen: 'a screenshot attempt was detected',
    devtools: 'developer tools were detected',
    completed: 'completed',
  }
  return map[type] || type
}
