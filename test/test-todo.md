
test('should generate and inject web action Urls into web-src/src/config.json, including action sequence url', async () => {
  global.loadFs(vol, 'sample-app')
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)

  const scripts = await AppScripts()

  await scripts.buildUI()
  const remoteOWCredentials = global.fakeConfig.tvm.runtime
  expect(vol.existsSync('/web-src/src/config.json')).toBe(true)
  const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultAppHostName + '/api/v1/web/sample-app-1.0.0/'
  expect(JSON.parse(vol.readFileSync('/web-src/src/config.json').toString())).toEqual({
    action: baseUrl + 'action',
    'action-zip': baseUrl + 'action-zip',
    'action-sequence': baseUrl + 'action-sequence'
  })
})

test('should generate and inject web and non web action urls into web-src/src/config.json', async () => {
  global.loadFs(vol, 'sample-app')
  mockAIOConfig.get.mockReturnValue(global.fakeConfig.tvm)

  const scripts = await AppScripts()
  // delete sequence action to make sure url generation works without sequences as well
  delete scripts._config.manifest.package.sequences
  // also make sure to test urls for non web actions
  delete scripts._config.manifest.package.actions.action.web

  await scripts.buildUI()
  const remoteOWCredentials = global.fakeConfig.tvm.runtime
  expect(vol.existsSync('/web-src/src/config.json')).toBe(true)
  const baseUrl = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultAppHostName + '/api/v1/web/sample-app-1.0.0/'
  const baseUrlNonWeb = 'https://' + remoteOWCredentials.namespace + '.' + global.defaultOwApiHost.split('https://')[1] + '/api/v1/sample-app-1.0.0/'
  expect(JSON.parse(vol.readFileSync('/web-src/src/config.json').toString())).toEqual({
    action: baseUrlNonWeb + 'action', // fake non web action
    'action-zip': baseUrl + 'action-zip'
  })
})