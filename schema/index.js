/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { USER_CONFIG_FILE, DEPLOY_CONFIG_FILE, IMPORT_CONFIG_FILE } = require('../src/lib/defaults')

module.exports = {
  [IMPORT_CONFIG_FILE]: require('./config.schema.json'),
  [USER_CONFIG_FILE]: require('./app.config.yaml.schema.json'),
  [DEPLOY_CONFIG_FILE]: require('./deploy.yaml.schema.json')
}
