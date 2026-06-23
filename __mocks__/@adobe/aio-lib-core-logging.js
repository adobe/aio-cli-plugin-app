const mocks = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  verbose: vi.fn(),
  debug: vi.fn(),
  silly: vi.fn()
}

const mockLogger = function () {
  return mocks
}

Object.assign(mockLogger, mocks)

mockLogger.mockReset = function () {
  Object.values(mocks).forEach(m => m.mockReset())
}

export default mockLogger
