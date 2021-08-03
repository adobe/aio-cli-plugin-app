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

const spinner = {
  stopAndPersist: jest.fn(() => {
    // console.error('stopAndPersist')
  }),
  stop: jest.fn((value) => {
    console.error(value)
  }),
  start: jest.fn((value) => {
    console.error(value)
  }),
  warn: jest.fn((value) => {
    console.error(value)
  }),
  info: jest.fn((msg) => {
    console.log(msg)
  }),
  error: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn((value) => {
    console.error(value)
  })
}

module.exports = () => {
  return spinner
}
