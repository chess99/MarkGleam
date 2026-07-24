import '@testing-library/jest-dom/vitest'

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true,
})

Object.defineProperty(document, 'fonts', {
  value: {
    ready: Promise.resolve(),
    add: () => undefined,
  },
  configurable: true,
})
