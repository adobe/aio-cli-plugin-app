const { validateJsonWithSchema } = require('../src/lib/install-helper')

describe('config.json', () => {
  const schemaName = 'config.json'

  test('validate success', () => {
    const { valid, errors } = validateJsonWithSchema(
      fixtureJson('valid.config.json'),
      schemaName
    )

    expect(errors).toEqual(null)
    expect(valid).toBeTruthy()
  })

  test('validate failure', () => {
    const { valid, errors } = validateJsonWithSchema(
      fixtureJson('invalid.config.json'),
      schemaName
    )

    // the 4 errors are the missing name properties, techacct migration to two new properties
    // the rest 3 are missing client_id and failing keyword `then`
    // 2 for failing if & else condition
    // 1 for failing client_id required criteria
    expect(errors.length).toEqual(10)
    expect(valid).toBeFalsy()
  })
})

describe('deploy.yaml', () => {
  const schemaName = 'deploy.yaml'

  test('validate success', () => {
    const { valid, errors } = validateJsonWithSchema(
      fixtureYaml('deploy.yaml/1.valid.yaml'),
      schemaName
    )

    expect(errors).toEqual(null)
    expect(valid).toBeTruthy()
  })

  test('validate failure', () => {
    const { valid, errors } = validateJsonWithSchema(
      fixtureYaml('deploy.yaml/1.invalid.yaml'),
      schemaName
    )

    expect(errors.length).toEqual(2)
    expect(valid).toBeFalsy()
  })
})
