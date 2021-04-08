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

// defaults

module.exports = {
  defaultAppHostname: 'adobeio-static.net',
  stageAppHostname: 'dev.runtime.adobe.io',
  defaultTvmUrl: 'https://firefly-tvm.adobe.io',
  defaultOwApihost: 'https://adobeioruntime.net',
  defaultHTMLCacheDuration: '60',
  defaultJSCacheDuration: '604800',
  defaultCSSCacheDuration: '604800',
  defaultImageCacheDuration: '604800',
  AIO_CONFIG_IMS_ORG_ID: 'project.org.ims_org_id',
  SERVICE_API_KEY_ENV: 'SERVICE_API_KEY',
  ENTP_INT_CERTS_FOLDER: 'entp-int-certs',
  CONSOLE_API_KEYS: {
    prod: 'aio-cli-console-auth',
    stage: 'aio-cli-console-auth-stage'
  },
  defaultHttpServerPort: 9080,
  AIO_CONFIG_WORKSPACE_SERVICES: 'project.workspace.details.services',
  AIO_CONFIG_ORG_SERVICES: 'project.org.details.services'
}
