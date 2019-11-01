
const Generator = require('yeoman-generator')
const path = require('path')

const getInitMessage = cwd => {
  let message = `Project setup
You are about to initialize a project in this directory:
  ${cwd}
Which CNA features do you want to enable for this project?
`
  return message
}

class createGenerator extends Generator {

  prompting () {
    let dest = process.cwd()
    this.log(getInitMessage(dest))
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
        name: 'componets',
        message: 'select components to include',
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
        ]
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
        }
      }
    ]

    return this.prompt(prompts).then(props => {
      const prompts = [
        {
          type: 'input',
          name: 'actionSetup',
          message: actionSetupMessage,
          default: 'actions',
          when: props.componets.indexOf('actions') !== -1
        },
        {
          type: 'input',
          name: 'webAssetSetup',
          message: webAssetSetupMessage,
          default: 'web-src',
          when: props.componets.indexOf('webAssets') !== -1
        }
      ]
      this.props = props
      return this.prompt(prompts).then(props => {
        this.componetsProps = props
      })
    })
  }

  writing () {
    this.sourceRoot('../templates')
    this.fs.copy(this.templatePath('base'), this.destinationPath())
    this.fs.copy(this.templatePath('base/.*'), this.destinationPath())
    if (this.props.componets.indexOf('actions') !== -1) {
      this.fs.copy(
        this.templatePath('actions'),
        this.destinationPath(this.componetsProps.actionSetup)
      )
    }

    if (this.props.componets.indexOf('webAssets') !== -1) {
      this.fs.copy(
        this.templatePath('actions'),
        this.destinationPath(this.componetsProps.webAssetSetup)
      )
    }
  }

  async install () {
    const prompts = [
      {
        name: 'installDependency',
        message: 'npm install dependencies now?',
        type: 'confirm',
        default: true
      }
    ]

    await this.prompt(prompts).then(props => {
      if (props.installDependency) {
        this.installDependencies()
      }
    })
  }
}

module.exports = createGenerator
