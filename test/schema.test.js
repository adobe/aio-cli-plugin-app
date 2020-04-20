const Ajv = require('ajv')
const schema = require('../schema/config.schema.json')

test('validate success', () => {
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(fixtureJson('valid.config.json'))
  expect(validate.errors).toEqual(null)
  expect(valid).toBeTruthy()
})

test('validate failure', () => {
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(fixtureJson('invalid.config.json'))
  // the two errors are the missing name properties
  expect(validate.errors.length).toEqual(2)
  expect(valid).toBeFalsy()
})
