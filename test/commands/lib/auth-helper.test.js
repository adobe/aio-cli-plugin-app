const { getAccessToken, bearerAuthHandler, setRuntimeApiHostAndAuthHandler, setCDNApiHostAndAuthHandler } = require('../../../src/lib/auth-helper')
const { getToken, context } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const { getCliEnv } = require('@adobe/aio-lib-env')

jest.mock('@adobe/aio-lib-ims')
jest.mock('@adobe/aio-lib-env')

describe('getAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should get token using CLI context (default) if current context undefined', async () => {
    const mockToken = 'mocked-token'
    const mockEnv = 'prod'
    getToken.mockResolvedValue(mockToken)
    getCliEnv.mockReturnValue(mockEnv)
    context.getCurrent.mockResolvedValue(undefined)

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
    const mockContext = { data: { access_token: { token: mockToken } } }
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
  const DEPLOY_SERVICE_ENDPOINTS = {
    prod: 'https://deploy-service.app-builder.adp.adobe.io',
    stage: 'https://deploy-service.stg.app-builder.corp.adp.adobe.io'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.AIO_DEPLOY_SERVICE_URL
  })

  test('should set runtime.apihost and runtime.auth_handler when config has runtime', () => {
    // test both envs
    {
      const mockEnv = 'prod'
      getCliEnv.mockReturnValue(mockEnv)

      const config = { runtime: {} }
      const result = setRuntimeApiHostAndAuthHandler(config)

      expect(result.runtime.apihost).toBe(`${DEPLOY_SERVICE_ENDPOINTS[mockEnv]}/runtime`)
      expect(result.runtime.auth_handler).toBe(bearerAuthHandler)
    }
    {
      const mockEnv = 'stage'
      getCliEnv.mockReturnValue(mockEnv)

      const config = { runtime: {} }
      const result = setRuntimeApiHostAndAuthHandler(config)

      expect(result.runtime.apihost).toBe(`${DEPLOY_SERVICE_ENDPOINTS[mockEnv]}/runtime`)
      expect(result.runtime.auth_handler).toBe(bearerAuthHandler)
    }
  })

  test('should set ow.apihost and ow.auth_handler when config has ow', () => {
    const mockEnv = 'unknown-env-should-use-prod'
    getCliEnv.mockReturnValue(mockEnv)

    const config = { ow: {} }
    const result = setRuntimeApiHostAndAuthHandler(config)

    expect(result.ow.apihost).toBe(`${DEPLOY_SERVICE_ENDPOINTS.prod}/runtime`)
    expect(result.ow.auth_handler).toBe(bearerAuthHandler)
  })

  test('should use custom deploy service URL from environment', () => {
    const mockEnv = 'prod'
    getCliEnv.mockReturnValue(mockEnv)

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

describe('setCDNApiHostAndAuthHandler', () => {
  const DEPLOY_SERVICE_ENDPOINTS = {
    prod: 'https://deploy-service.app-builder.adp.adobe.io',
    stage: 'https://deploy-service.stg.app-builder.corp.adp.adobe.io'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.AIO_DEPLOY_SERVICE_URL
  })

  test('should set web.apihost and web.auth_handler and preserve namespace from ow', () => {
    const mockEnv = 'stage'
    getCliEnv.mockReturnValue(mockEnv)

    const config = { web: {}, ow: { namespace: 'ns' } }
    const result = setCDNApiHostAndAuthHandler(config)

    expect(result.web.apihost).toBe(`${DEPLOY_SERVICE_ENDPOINTS[mockEnv]}/cdn-api`)
    expect(result.web.auth_handler).toBe(bearerAuthHandler)
    expect(result.web.namespace).toBe('ns')
  })

  test('should be a no-op if config has no web key', () => {
    const mockEnv = 'prod'
    getCliEnv.mockReturnValue(mockEnv)
    const input = { ow: { namespace: 'ns' }, other: {} }
    const result = setCDNApiHostAndAuthHandler(input)
    expect(result).toEqual(input)
  })

  test('should use custom deploy service URL from environment', () => {
    const customUrl = 'https://custom-deploy-service.example.com'
    process.env.AIO_DEPLOY_SERVICE_URL = customUrl
    getCliEnv.mockReturnValue('prod')

    const config = { web: {}, ow: { namespace: 'ns' } }
    const result = setCDNApiHostAndAuthHandler(config)
    expect(result.web.apihost).toBe(`${customUrl}/cdn-api`)
  })

  test('falls back to prod endpoint for unknown env', () => {
    getCliEnv.mockReturnValue('mystery-env')
    const config = { web: {}, ow: { namespace: 'ns' } }
    const result = setCDNApiHostAndAuthHandler(config)
    expect(result.web.apihost).toBe(`${DEPLOY_SERVICE_ENDPOINTS.prod}/cdn-api`)
  })
})
