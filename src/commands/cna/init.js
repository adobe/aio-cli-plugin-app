
const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const inquirer = require('inquirer')

const GetInitMessage = cwd => {
  let message =
    `You are about to initialize a project in this directory:

  ${cwd}
  
Which CNA features do you want to enable for this project? 
`
  return message
}

class CNAInit extends Command {
  async run() {
    const {args, flags} = this.parse(CNAInit)
    this.log(GetInitMessage(process.cwd()))

    let responses = await inquirer.prompt([{
      name: 'components',
      message: 'select components to include',
      type: 'checkbox',
      choices: [
        {
          name: 'Database: Deploy database rules',
          value: 'database',
          short: 'Database',
        },
        {
          name: 'Functions: Deploy Runtime functions',
          value: 'functions',
          short: 'Functions',
          checked: true,
        },
        {
          name: 'Web Assets: Deploy hosted static assets',
          value: 'assets',
          short: 'Web Assets',
          checked: true,
        },
      ],
    }])

    if (responses.components.indexOf('database') > -1) {
      this.log('/// Database Setup')
      this.log('more questions here')
    }

    if (responses.components.indexOf('functions') > -1) {
      this.log('/// Runtime Function Setup')
      this.log('more questions here')
    }

    if (responses.components.indexOf('assets') > -1) {
      this.log('/// Web Assets Setup')
      this.log('more questions here')
    }
  }
}
CNAInit.description = `Initialize a Cloud Native Application
`

// CNAInit.args = [

// ]

// CNAInit.flags = {

// }

module.exports = CNAInit
