/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const spinner = {
  stopAndPersist: vi.fn(() => {
    // console.error('stopAndPersist')
  }),
  stop: vi.fn((value) => {
    console.error(value)
  }),
  start: vi.fn((value) => {
    console.error(value)
  }),
  warn: vi.fn((value) => {
    console.error(value)
  }),
  info: vi.fn((msg) => {
    console.log(msg)
  }),
  error: vi.fn(),
  fail: vi.fn(),
  succeed: vi.fn((value) => {
    console.error(value)
  })
}

export default () => {
  return spinner
}
