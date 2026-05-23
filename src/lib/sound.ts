// Web Audio API — isolated, silent on error
let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function playBell(): void {
  try {
    const ac = getCtx()
    if (ac.state === 'suspended') void ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.5)
    gain.gain.setValueAtTime(0.4, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 0.8)
  } catch { /* noop */ }
}

export function playTick(): void {
  try {
    const ac = getCtx()
    if (ac.state === 'suspended') void ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, ac.currentTime)
    gain.gain.setValueAtTime(0.15, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + 0.06)
  } catch { /* noop */ }
}
