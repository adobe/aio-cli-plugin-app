const config = require('@adobe/eslint-config-aio-lib-config')

module.exports = [
  ...config,
  {
    languageOptions: {
      globals: {
        NoErrorThrownError: true,
        getErrorForCallThatShouldThrowAnError: true,
        fixturePath: true,
        fixtureFile: true,
        fixtureJson: true,
        fixtureHjson: true,
        fixtureYaml: true,
        fakeFileSystem: true,
        setFetchMock: true,
        createOclifMockConfig: true,
        loadFixtureApp: true,
        defaultAppHostName: true,
        defaultTvmUrl: true,
        defaultOwApihost: true,
        fakeS3Bucket: true,
        fakeOrgId: true,
        fakeConfig: true,
        aioLegacyAppConfig: true,
        fakeS3Creds: true,
        extraConfig: true,
        fakeTVMResponse: true
      }
    },
    settings: {
      jsdoc: {
        ignorePrivate: true
      }
    },
    rules: {
      'jsdoc/no-defaults': 0,
      'jsdoc/tag-lines': [
        'error',
        'never',
        {
          startLines: null
        }
      ]
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        jest: true,
        describe: true,
        test: true,
        it: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true
      }
    }
  }
]
