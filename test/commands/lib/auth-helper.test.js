const { bearerAuthHandler, setRuntimeApiHostAndAuthhandler } = require('../../../src/lib/auth-helper')
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

describe('setRuntimeApiHostAndAuthhandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should set runtime.apihost and runtime.auth_handler when config has runtime', () => {
    const config = { runtime: {} }
    const result = setRuntimeApiHostAndAuthhandler(config)

    expect(result.runtime.apihost).toBe(process.env.APIHOST ?? 'https://adobeioruntime.net/runtime')
    expect(result.runtime.auth_handler).toBe(bearerAuthHandler)
  })

  test('should set ow.apihost and ow.auth_handler when config has ow', () => {
    const config = { ow: {} }
    const result = setRuntimeApiHostAndAuthhandler(config)

    expect(result.ow.apihost).toBe(process.env.APIHOST ?? 'https://adobeioruntime.net/runtime')
    expect(result.ow.auth_handler).toBe(bearerAuthHandler)
  })

  test('should return config unchanged when config has neither runtime nor ow', () => {
    const config = { other: {} }
    const result = setRuntimeApiHostAndAuthhandler(config)

    expect(result).toBe(config)
  })

  test('should return null when config is null', () => {
    const result = setRuntimeApiHostAndAuthhandler(null)

    expect(result).toBeNull()
  })
})
