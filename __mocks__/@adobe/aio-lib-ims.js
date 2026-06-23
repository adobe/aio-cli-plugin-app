export const getToken = vi.fn()
export const getTokenData = vi.fn()
export const invalidateToken = vi.fn()
export const context = {
  getCurrent: vi.fn(),
  setCurrent: vi.fn(),
  getCli: vi.fn(),
  setCli: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(),
  getContextValue: vi.fn(),
  setContextValue: vi.fn(),
  getConfigValue: vi.fn(),
  setConfigValue: vi.fn(),
  contextKeys: vi.fn()
}
export const Ims = vi.fn()

const mockLibIms = { getToken, getTokenData, invalidateToken, context, Ims }
export default mockLibIms
