const mockConfig = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  reload: jest.fn(),
  dotenv: jest.fn(),
  getPipedData: jest.fn()
}

module.exports = mockConfig
