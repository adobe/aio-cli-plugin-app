const mockConfig = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  reload: vi.fn(),
  dotenv: vi.fn(),
  getPipedData: vi.fn()
}

export default mockConfig
