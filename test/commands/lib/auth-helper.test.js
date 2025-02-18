const { bearerAuthHandler } = require('../../../src/lib/auth-helper')
const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const { getCliEnv } = require('@adobe/aio-lib-env')

jest.mock('@adobe/aio-lib-ims')
jest.mock('@adobe/aio-lib-env')

describe('bearerAuthHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getAuthHeader should return a Bearer token', async () => {
    const mockToken = 'mocked-token'
    getToken.mockResolvedValue(mockToken)
    getCliEnv.mockReturnValue('test-env')

    const result = await bearerAuthHandler.getAuthHeader()

    expect(context.setCli).toHaveBeenCalledWith({ 'cli.bare-output': true }, false)
    expect(getCliEnv).toHaveBeenCalled()
    expect(getToken).toHaveBeenCalledWith(CLI)
    expect(result).toBe(`Bearer ${mockToken}`)
  })
})
