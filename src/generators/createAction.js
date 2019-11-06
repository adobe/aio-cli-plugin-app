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

const path = require('path')
const Generator = require('yeoman-generator')

const { version } = require('../../package.json')

class ActionGenerator extends Generator {
  constructor (args, opts) {
    super(args, opts)
    this.option('skip_prompt')
  }

  async prompting () {
    this.pjson = this.fs.readJSON('package.json')

    if (!this.pjson) {
      throw new Error('not in an Adobe I/O App project directory')
    }

    this.props = Object.assign({}, this.options, {
      package_name: this.pjson.name
    })

    // ${this.options.event}
    this.log(`Adding an action to ${this.pjson.name} Version: ${version}`)

    this.componentsProps = Object.assign({}, this.options, /* props, */ {
      actionSetup: 'actions'
    })

    // todo: read package_name from root package.json name
    // todo: load action output folder from aio config, as actionSetup
    // todo: if action output folder (actionSetup) dne, prompt for a name, default: actions 
  }

  writing () {
    // todo: log action output
    // - create actions folder if dne

    this.sourceRoot(path.join(__dirname, '../templates'))
    this.fs.copyTpl(
      this.templatePath('actions'),
      this.destinationPath(this.componentsProps.actionSetup),
      this.props)

    // todo: are we adding any package dependencies?
    // - we need to track them and write them to root package.json
    // - add the new action to manifest.yml
    // did this change?
    // this.fs.writeJSON(this.destinationPath('./package.json'), this.pjson)
  }

  async install () {
    // todo: did the dependencies change? is npm i required?
    if (this.options.skip_prompt) {
      return this.installDependencies({ bower: false })
    }
    const prompts = [{
      name: 'installDeps',
      message: 'npm install dependencies now?',
      type: 'confirm',
      default: true
    }]
    return this.prompt(prompts).then(props => {
      if (props.installDeps) {
        return this.installDependencies({ bower: false })
      }
    })
  }
}

module.exports = ActionGenerator
