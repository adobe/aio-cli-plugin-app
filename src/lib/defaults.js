/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// defaults & constants

export const defaultAppHostname = 'adobeio-static.net'
export const stageAppHostname = 'dev.runtime.adobe.io'
export const defaultTvmUrl = 'https://firefly-tvm.adobe.io'
export const defaultOwApihost = 'https://adobeioruntime.net'
export const defaultHTMLCacheDuration = '60'
export const defaultJSCacheDuration = '604800'
export const defaultCSSCacheDuration = '604800'
export const defaultImageCacheDuration = '604800'
export const AIO_CONFIG_IMS_ORG_ID = 'project.org.ims_org_id'
export const SERVICE_API_KEY_ENV = 'SERVICE_API_KEY'
export const IMS_OAUTH_S2S_ENV = 'IMS_OAUTH_S2S'
export const ENTP_INT_CERTS_FOLDER = 'entp-int-certs'
export const CONSOLE_API_KEYS = {
  prod: 'aio-cli-console-auth',
  stage: 'aio-cli-console-auth-stage'
}
export const defaultHttpServerPort = 9080
export const AIO_CONFIG_WORKSPACE_SERVICES = 'project.workspace.details.services'
export const AIO_CONFIG_ORG_SERVICES = 'project.org.details.services'
export const IMPORT_CONFIG_FILE = 'config.json'
export const USER_CONFIG_FILE = 'app.config.yaml'
export const DEPLOY_CONFIG_FILE = 'deploy.yaml'
export const PACKAGE_LOCK_FILE = 'package-lock.json'
export const LEGACY_RUNTIME_MANIFEST = 'manifest.yml'
export const INCLUDE_DIRECTIVE = '$include'
export const APPLICATION_CONFIG_KEY = 'application'
export const EXTENSIONS_CONFIG_KEY = 'extensions'
// Adding tracking file constants
export const LAST_BUILT_ACTIONS_FILENAME = 'last-built-actions.json'
export const LAST_DEPLOYED_ACTIONS_FILENAME = 'last-deployed-actions.json'
// Database constants
export const DB_STATUS = {
  PROVISIONED: 'PROVISIONED',
  REQUESTED: 'REQUESTED',
  PROCESSING: 'PROCESSING',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  NOT_PROVISIONED: 'NOT_PROVISIONED',
  DELETED: 'DELETED',
  UNKNOWN: 'UNKNOWN'
}
