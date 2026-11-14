// Inactivity watchdog. Calls the lock handler once the timeout elapses.

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'visibilitychange']

export class AutoLock {
  constructor(onLock) {
    this.onLock = onLock
    this.minutes = 5
    this.timer = null
    this.running = false
    this.bound = this.handleActivity.bind(this)
  }

  setMinutes(minutes) {
    this.minutes = Math.max(1, Number(minutes) || 5)
    if (this.running) {
      this.reset()
    }
  }

  start() {
    if (this.running) return
    this.running = true
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, this.bound, { passive: true })
    }
    this.reset()
  }

  stop() {
    this.running = false
    this.clear()
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, this.bound)
    }
  }

  reset() {
    this.clear()
    if (!this.running) return
    this.timer = window.setTimeout(() => {
      this.clear()
      this.onLock('idle')
    }, this.minutes * 60000)
  }

  handleActivity(event) {
    if (event && event.type === 'visibilitychange' && document.visibilityState !== 'visible') {
      return
    }
    this.reset()
  }

  clear() {
    if (this.timer) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
  }
}