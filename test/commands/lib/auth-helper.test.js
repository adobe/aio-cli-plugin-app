const { getAccessToken, bearerAuthHandler, setRuntimeApiHostAndAuthHandler } = require('../../../src/lib/auth-helper')
const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const { getCliEnv } = require('@adobe/aio-lib-env')

jest.mock('@adobe/aio-lib-ims')
jest.mock('@adobe/aio-lib-env')

describe('getAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should get token using CLI context by default', async () => {
    const mockToken = 'mocked-token'
    const mockEnv = 'prod'
    getToken.mockResolvedValue(mockToken)
    getCliEnv.mockReturnValue(mockEnv)
    context.getCurrent.mockResolvedValue(CLI)

    const result = await getAccessToken()

    expect(context.setCli).toHaveBeenCalledWith({ 'cli.bare-output': true }, false)
    expect(getCliEnv).toHaveBeenCalled()
    expect(getToken).toHaveBeenCalledWith(CLI)
    expect(result).toEqual({ accessToken: mockToken, env: mockEnv })
  })

  test('should use custom context if set', async () => {
    const mockToken = 'mocked-token'
    const mockEnv = 'prod'
    const customContext = 'custom-context'
    getToken.mockResolvedValue(mockToken)
    getCliEnv.mockReturnValue(mockEnv)
    context.getCurrent.mockResolvedValue(customContext)

    const result = await getAccessToken()

    expect(context.setCli).not.toHaveBeenCalled()
    expect(getToken).toHaveBeenCalledWith(customContext)
    expect(result).toEqual({ accessToken: mockToken, env: mockEnv })
  })

  test('should use cached token when requested', async () => {
    const mockToken = 'cached-token'
    const mockEnv = 'prod'
    const mockContext = { access_token: { token: mockToken } }
    getCliEnv.mockReturnValue(mockEnv)
    context.getCurrent.mockResolvedValue(CLI)
    context.get.mockResolvedValue(mockContext)

    const result = await getAccessToken({ useCachedToken: true })

    expect(getToken).not.toHaveBeenCalled()
    expect(context.get).toHaveBeenCalledWith(CLI)
    expect(result).toEqual({ accessToken: mockToken, env: mockEnv })
  })
})

describe('bearerAuthHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getAuthHeader should return a Bearer token', async () => {
    const mockToken = 'mocked-token'
    getToken.mockResolvedValue(mockToken)
    getCliEnv.mockReturnValue('prod')
    context.getCurrent.mockResolvedValue(CLI)

    const result = await bearerAuthHandler.getAuthHeader()

    expect(result).toBe(`Bearer ${mockToken}`)
  })
})

describe('setRuntimeApiHostAndAuthHandler', () => {
  const defaultDeployServiceUrl = 'https://deploy-service.app-builder.adp.adobe.io'

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.AIO_DEPLOY_SERVICE_URL
  })

  test('should set runtime.apihost and runtime.auth_handler when config has runtime', () => {
    const config = { runtime: {} }
    const result = setRuntimeApiHostAndAuthHandler(config)

    expect(result.runtime.apihost).toBe(`${defaultDeployServiceUrl}/runtime`)
    expect(result.runtime.auth_handler).toBe(bearerAuthHandler)
  })

  test('should set ow.apihost and ow.auth_handler when config has ow', () => {
    const config = { ow: {} }
    const result = setRuntimeApiHostAndAuthHandler(config)

    expect(result.ow.apihost).toBe(`${defaultDeployServiceUrl}/runtime`)
    expect(result.ow.auth_handler).toBe(bearerAuthHandler)
  })

  test('should use custom deploy service URL from environment', () => {
    const customUrl = 'https://custom-deploy-service.example.com'
    process.env.AIO_DEPLOY_SERVICE_URL = customUrl
    const config = { runtime: {} }
    const result = setRuntimeApiHostAndAuthHandler(config)

    expect(result.runtime.apihost).toBe(`${customUrl}/runtime`)
  })

  test('should return undefined when config is null or undefined', () => {
    expect(setRuntimeApiHostAndAuthHandler(null)).not.toBeDefined()
    expect(setRuntimeApiHostAndAuthHandler()).not.toBeDefined()
  })

  test('should return undefined when config has neither runtime nor ow', () => {
    const config = { other: {} }
    const result = setRuntimeApiHostAndAuthHandler(config)
    expect(result).not.toBeDefined()
  })
})
