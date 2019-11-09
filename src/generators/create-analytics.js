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

const Generator = require('yeoman-generator')
const path = require('path')

/*
      'initializing',
      'prompting',
      'configuring',
      'default',
      'writing',
      'conflicts',
      'install',
      'end'
      */

class CreateGenerator extends Generator {
  constructor (args, opts) {
    super(args, opts)
    this.option('skip_prompt')
  }

  prompting () {
    let dest = process.cwd()
    const showPrompt = !this.options.skip_prompt
    this.log(`Project setup
You are about to initialize a project in this directory:
  ${dest}`)

    let actionSetupMessage = `
/* Actions Setup */
An actions directory will be created in your project with a Node.js
package pre-configured.
What folder do you want to use as your public action directory?
`

    let webAssetSetupMessage = `
/* Web Assets Setup */
The public directory is the folder (inside your project directory) that
will contain static assets to be uploaded to cloud storage. If you
have a build process use your build's output directory.
What folder do you want to use as your public web assets directory?
`

    const prompts = [
      {
        type: 'checkbox',
        name: 'components',
        message: 'Which CNA features do you want to enable for this project?\nselect components to include',
        choices: [
          {
            name: 'Actions: Deploy Runtime actions',
            value: 'actions',
            checked: true
          },
          {
            name: 'Web Assets: Deploy hosted static assets',
            value: 'webAssets',
            checked: true
          }
        ],
        when: showPrompt
      },
      {
        type: 'input',
        name: 'package_name',
        message: 'package name',
        default: path.parse(dest).name,
        validate (input) {
          // Validate name for invalid chars, it is also used for S3 url
          let valid = /^[a-zA-Z0-9_-]*$/
          if (valid.test(input)) {
            return true
          }
          return `'${input}' contains invalid characters and is not a valid package name`
        },
        when: showPrompt
      }
    ]

    return this.prompt(prompts).then(props => {
      if (showPrompt) {
        const prompts = [
          {
            type: 'input',
            name: 'actionSetup',
            message: actionSetupMessage,
            default: 'actions',
            when: props.components.indexOf('actions') !== -1
          },
          {
            type: 'input',
            name: 'webAssetSetup',
            message: webAssetSetupMessage,
            default: 'web-src',
            when: props.components.indexOf('webAssets') !== -1
          }
        ]
        this.props = props
        return this.prompt(prompts).then(props => {
          this.componentsProps = props
        })
      } else {
        this.props = Object.assign({}, this.options, props, {
          components: ['actions', 'webAssets'],
          package_name: path.parse(dest).name
        })
        this.componentsProps = Object.assign({}, this.options, props, {
          actionSetup: 'actions',
          webAssetSetup: 'web-src'
        })
      }
    })
  }

  writing () {
    this.sourceRoot(path.join(__dirname, '../templates/analytics'))

    // copy everything that does not start with an _
    this.fs.copyTpl(`${this.templatePath()}/base/**/!(_)*/`,
      this.destinationPath(),
      this.props)

    // the above excluded our strangely named .env file, lets fix it
    this.fs.copyTpl(this.templatePath('base/_dot.env'),
      this.destinationPath('.env'),
      this.props)

    if (this.props.components.indexOf('actions') !== -1) {
      this.fs.copyTpl(
        this.templatePath('actions'),
        this.destinationPath(this.componentsProps.actionSetup),
        this.props)
    }

    if (this.props.components.indexOf('webAssets') !== -1) {
      this.fs.copyTpl(
        this.templatePath('web-src'),
        this.destinationPath(this.componentsProps.webAssetSetup),
        this.props)
    }
  }

  async install () {
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

module.exports = CreateGenerator
