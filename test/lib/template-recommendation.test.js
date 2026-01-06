/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// Unmock the module (in case it's mocked by other tests like init.test.js)
jest.unmock('../../src/lib/template-recommendation')

// Unmock the module in case init.test.js has mocked it
jest.unmock('../../src/lib/template-recommendation')

// Mock fetch before requiring the module
global.fetch = jest.fn()

const { getAIRecommendation } = require('../../src/lib/template-recommendation')

describe('template-recommendation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.TEMPLATE_RECOMMENDATION_API
  })

  describe('getAIRecommendation', () => {
    test('should return template from API response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ template: '@adobe/generator-app-excshell', description: 'Test' })
      })

      const result = await getAIRecommendation('I want a web app')

      expect(result).toEqual({ template: '@adobe/generator-app-excshell', description: 'Test' })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('recommend-template'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'I want a web app' })
        })
      )
    })

    test('should return data.body when response has body wrapper', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          body: { template: '@adobe/test-template' }
        })
      })

      const result = await getAIRecommendation('test prompt')

      expect(result).toEqual({ template: '@adobe/test-template' })
    })

    test('should use environment variable URL when set', async () => {
      process.env.TEMPLATE_RECOMMENDATION_API = 'https://custom-env.url/api'
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ template: 'test' })
      })

      await getAIRecommendation('test')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom-env.url/api',
        expect.any(Object)
      )
    })

    test('should use provided apiUrl parameter over env var', async () => {
      process.env.TEMPLATE_RECOMMENDATION_API = 'https://env.url/api'
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ template: 'test' })
      })

      await getAIRecommendation('test', 'https://param.url/api')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://param.url/api',
        expect.any(Object)
      )
    })

    test('should throw error when API returns non-ok response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      })

      await expect(getAIRecommendation('test')).rejects.toThrow('API returned status 500')
    })

    test('should throw error on network failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'))

      await expect(getAIRecommendation('test')).rejects.toThrow('Network error')
    })

    test('should handle empty response body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      })

      const result = await getAIRecommendation('test')

      expect(result).toEqual({})
    })

    test('should pass prompt in request body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ template: 'test' })
      })

      await getAIRecommendation('my custom prompt')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ prompt: 'my custom prompt' })
        })
      )
    })
  })
})
