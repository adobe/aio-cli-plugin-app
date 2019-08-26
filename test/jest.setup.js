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

const { stdout, stderr } = require('stdout-stderr')

// trap console log
beforeEach(() => { stdout.start(); stderr.start() })
afterEach(() => { stdout.stop(); stderr.stop() })

process.on('unhandledRejection', error => {
  throw error
})

// const fs = require.requireActual('fs-extra')
// dont touch the real fs
jest.mock('fs-extra')
// don't wait for user input in tests
jest.mock('inquirer')
// make sure we mock the cna scripts
jest.mock('@adobe/io-cna-scripts')
//
jest.mock('ora')
//
jest.mock('which')
//
jest.mock('execa')
