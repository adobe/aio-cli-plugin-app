/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
/**
 * Test action
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
