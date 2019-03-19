const {Command, flags} = require('@oclif/command')

class CNACreate extends Command {
  async run() {
    const {flags} = this.parse(CNACreate)
    const name = flags.name || 'world'
    this.log('CNA Create ', name)
  }
}

CNACreate.description = `Create a new Cloud Native Application
...
Select options, and go
`

CNACreate.flags = {
  name: flags.string({
    char: 'n',
    description: 'name of the app',
  }),
  dir: flags.string({
    char: 'd',
    description: 'Directory to create the app in',
    default: '.',
  }),

}

module.exports = CNACreate
