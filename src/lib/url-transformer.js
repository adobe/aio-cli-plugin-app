/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Transforms action URLs to use next-adobeioruntime.net for display
 */
function transformActionUrl (url) {
  if (!url || typeof url !== 'string') {
    return url
  }
  return url.replace(/adobeioruntime\.net/g, 'next-adobeioruntime.net')
}

function transformActionEntities (actions) {
  if (!Array.isArray(actions)) {
    return actions
  }
  return actions.map(action => ({
    ...action,
    url: action.url ? transformActionUrl(action.url) : action.url
  }))
}

function transformActionUrlsObject (actionUrls) {
  if (!actionUrls || typeof actionUrls !== 'object') {
    return actionUrls
  }
  const transformed = {}
  for (const [key, value] of Object.entries(actionUrls)) {
    transformed[key] = transformActionUrl(value)
  }
  return transformed
}

module.exports = {
  transformActionUrl,
  transformActionEntities,
  transformActionUrlsObject
}
