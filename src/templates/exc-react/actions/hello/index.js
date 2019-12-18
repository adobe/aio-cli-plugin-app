/**
 * main action
 * @param args
 * @returns {{body: string}}
 */
function main (args) {
  const headers = {
    'content-type': 'application/json'
  }

  let message = 'you didn\'t tell me who you are.'
  if (args.name) {
    const name = args.name.trim()

    if (name.startsWith('!')) {
      // error command
      return {
        headers: headers,
        statusCode: 400,
        body: {
          error: name.substring(1)
        }
      }
    }

    message = `hello ${name}!`
  }
  return {
    headers: headers,
    body: {
      message
    }
  }
}

exports.main = main
