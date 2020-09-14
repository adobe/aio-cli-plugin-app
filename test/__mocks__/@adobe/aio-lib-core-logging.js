const mocks = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
  silly: jest.fn()
}

const mockLogger = function () {
  return mocks
}

Object.assign(mockLogger, mocks)

mockLogger.mockReset = function () {
  Object.values(mocks).forEach(m => m.mockReset())
}

module.exports = mockLogger
