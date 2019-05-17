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

/*
  This is a basic template definition ( for now )
  in the future, a template could have additional steps, like a post-install script to call or something
  templates could also define different locations of their 'meat', currently the 'path' value is expected
  to point towards a relative folder containing the template files
*/
module.exports = {
  createTemplates: {
    'basic-action-view-app': {
      description: 'the most basic of the basics',
      path: 'basic-action-view-app'
    },
    'basic-action-view-app2': {
      description: 'the 2nd most basic of the basics',
      path: 'basic-action-view-app'
    },
    'basic-action-view-app3': {
      description: 'the 3rd most basic of the basics',
      path: 'basic-action-view-app'
    }
  },
  assets: {
    path: 'web-assets'
  },
  actions: {
    path: 'actions'
  }
}
