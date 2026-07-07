type GAEventValue = string | number | boolean | null | undefined

type GAEventParams = Record<string, GAEventValue>

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const SESSION_ID_STORAGE_KEY = 'mas-mc-ga-session-id'
const ANALYTICS_USER_KEY = 'mas-mc-ga-user-id'
const DEFAULT_APP_NAME = 'MAS Multiple Choice'
let initialized = false
let initializedMeasurementId: string | null = null
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{10}$/

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function toImportMetaEnv(): Record<string, string | boolean | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeMeta = import.meta as unknown as { env?: Record<string, string | boolean | undefined> }
  return safeMeta.env ?? {}
}

function getMeasurementId(): string | null {
  const env = toImportMetaEnv()
  const value = env.VITE_GA_MEASUREMENT_ID
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function isValidMeasurementId(id: string): boolean {
  return MEASUREMENT_ID_PATTERN.test(id)
}

export function getAnalyticsMeasurementId(): string | null {
  return getMeasurementId()
}

export function isAnalyticsConfigured(): boolean {
  const id = getMeasurementId()
  if (!id) {
    return false
  }
  return isValidMeasurementId(id)
}

export function getAnalyticsConfigError(): string | null {
  const id = getMeasurementId()
  if (!id) {
    return 'missing_measurement_id'
  }
  if (!isValidMeasurementId(id)) {
    return 'invalid_measurement_id'
  }
  return null
}

function createStableId(prefix: string): string {
  if (!isBrowser()) {
    return `${prefix}-server`
  }

  const randomToken = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`

  return `${prefix}-${randomToken}`
}

function getOrCreateId(storageKey: string, fallbackPrefix: string): string {
  if (!isBrowser()) {
    return createStableId(fallbackPrefix)
  }

  const cached = window.localStorage.getItem(storageKey)
  if (cached && cached.trim()) {
    return cached
  }

  const generated = createStableId(fallbackPrefix)
  window.localStorage.setItem(storageKey, generated)
  return generated
}

function getCommonParams() {
  return {
    app_name: DEFAULT_APP_NAME,
    app_id: 'mas-mc',
    ga_session_id: getOrCreateId(SESSION_ID_STORAGE_KEY, 'session'),
    ga_user_id: getOrCreateId(ANALYTICS_USER_KEY, 'user'),
    platform: 'web',
    language: isBrowser() ? navigator.language : 'unknown'
  }
}

function ensureGtagReady(): void {
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag === 'function') {
    return
  }

  window.gtag = (...args: unknown[]): void => {
    window.dataLayer.push(args)
  }
}

function loadGtagScript(measurementId: string): void {
  if (!isBrowser()) {
    return
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[data-ga-measurement="${measurementId}"]`)
  if (existing) {
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  script.setAttribute('data-ga-measurement', measurementId)
  script.addEventListener('error', () => {
    initialized = false
    initializedMeasurementId = null
    if (import.meta.env.DEV) {
      console.warn('[GA4] Failed to load gtag.js')
    }
  })
  document.head.appendChild(script)
}

export function initializeAnalytics(): boolean {
  if (!isBrowser()) {
    return false
  }

  if (initialized) {
    return initializedMeasurementId !== null
  }

  const measurementId = getMeasurementId()
  if (!measurementId) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] Missing VITE_GA_MEASUREMENT_ID')
    }
    return false
  }

  if (!isValidMeasurementId(measurementId)) {
    if (import.meta.env.DEV) {
      console.warn('[GA4] Invalid VITE_GA_MEASUREMENT_ID format:', measurementId)
    }
    return false
  }

  ensureGtagReady()
  loadGtagScript(measurementId)

  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: true
  })

  initialized = true
  initializedMeasurementId = measurementId
  return true
}

export function isAnalyticsReady(): boolean {
  return initialized && initializedMeasurementId !== null && isBrowser()
}

export function trackEvent(name: string, params: GAEventParams = {}): void {
  if (!isAnalyticsReady()) {
    return
  }
  window.gtag('event', name, {
    ...getCommonParams(),
    ...params
  })
}

export function trackModeEvent(mode: string, chapter: string, totalQuestions: number): void {
  trackEvent('mode_enter', {
    session_mode: mode,
    chapter_label: chapter,
    question_count: totalQuestions
  })
}

export function trackQuestionEvent(
  action: string,
  questionId: string,
  questionType: string,
  chapter: string,
  additional?: GAEventParams
): void {
  trackEvent(action, {
    question_id: questionId,
    question_type: questionType,
    chapter_label: chapter,
    ...(additional ?? {})
  })
}
