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
  // the 4 errors are the missing name properties, techacct migration to two new properties
  // the rest 3 are missing client_id and failing keyword `then`
  expect(validate.errors.length).toEqual(7)
  expect(valid).toBeFalsy()
})
