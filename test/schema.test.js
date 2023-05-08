const Ajv = require('ajv')
const ajvAddFormats = require('ajv-formats')
const schema = require('../schema/config.schema.json')

test('validate success', () => {
  const ajv = new Ajv({ allErrors: true })
  ajvAddFormats(ajv)
  const validate = ajv.compile(schema)
  const valid = validate(fixtureJson('valid.config.json'))
  expect(validate.errors).toEqual(null)
  expect(valid).toBeTruthy()
})

test('validate failure', () => {
  const ajv = new Ajv({ allErrors: true })
  ajvAddFormats(ajv)
  const validate = ajv.compile(schema)
  const valid = validate(fixtureJson('invalid.config.json'))
  // the 4 errors are the missing name properties, techacct migration to two new properties
  // the rest 3 are missing client_id and failing keyword `then`
  // 2 for failing if & else condition
  // 1 for failing client_id required criteria
  expect(Array.isArray(validate.errors)).toBe(true)
  expect(validate.errors.length).toEqual(10)
  expect(valid).toBeFalsy()
})

test('validate success - OAuth S2S', () => {
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(fixtureJson('oauths2s/valid.config.json'))
  expect(validate.errors).toEqual(null)
  expect(valid).toBeTruthy()
})

test('validate success - OAuth S2S Migrate', () => {
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(fixtureJson('oauths2s/valid.config.migrate.json'))
  expect(validate.errors).toEqual(null)
  expect(valid).toBeTruthy()
})
