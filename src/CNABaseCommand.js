const { Command, flags } = require('@oclif/command')

class CNABaseCommand extends Command {}

CNABaseCommand.flags = {
  verbose: flags.boolean({ char: 'v', description: 'Verbose output' }),
  version: flags.boolean({ description: 'Show version' }),
  help: flags.boolean({ char: 'h', description: 'Show help' })
}

module.exports = CNABaseCommand
