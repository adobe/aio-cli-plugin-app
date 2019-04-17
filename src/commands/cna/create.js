
const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const path = require('path')
const fs = require('fs-extra')
const tmp = require('tmp')
const spawn = require('cross-spawn')
// const which = require('which')
const npa = require('npm-package-arg')
// const fetch = require('../../util/fetch')

// 'https://registry.npmjs.org/' // <= this is the normal default
const defaultRegistry = 'https://artifactory.corp.adobe.com/artifactory/api/npm/npm-adobe-release/'

// Creates temp dir that is deleted on process exit
// returns name of dir
function getSelfDestructingTempDir () {
  return tmp.dirSync({
    prefix: 'cna-create-',
    unsafeCleanup: false,
  }).name
}

class CNACreate extends Command {
  async run() {

    const {args, flags} = this.parse(CNACreate)

    // 1. make path absolute
    let destDir = path.resolve(args.path)

    // 2. Make sure we have npm, fatal otherwise
    // if (!isNpmInstalled()) {
    //   this.error("oops, npm is required.")
    // }

    // let result = npa('git+https://git.corp.adobe.com:CNA/runtime-cna-starter.git')
    // console.log('result : ', result)

    // 3. create destination if not there
    if (!fs.existsSync(destDir)) {
      this.log('Creating dir for app: ', destDir)
      fs.mkdirSync(destDir)
    }
    // 4. fail if destination is not empty
    if (fs.readdirSync(destDir).length > 0) {
      this.error('Expected destination path to be empty: ' + destDir)
    }

    // 5 get and copy our template files over
    // 5a create a temp directory
    let tmpDest = getSelfDestructingTempDir()
    console.log('tmpDest = ' + tmpDest)


    // 5b call npm i with spec+temp temp destination
    fs.ensureDirSync(path.join(tmpDest,'node_modules'))
    let res = this.npmInstall(flags.template, tmpDest, flags.registry || defaultRegistry)
    res.then( () => {
      console.log('success ... ' + tmpDest)
      // 5c copy files from temp to dest 
      // let srcPath = require.resolve(flags.template, {paths: [tmpDest]})
      // let srcDir = path.dirname(srcPath)

      let srcDir = path.join(tmpDest,'node_modules',flags.template)
     
      console.log('srcDir = ' + srcDir)
      fs.copySync(srcDir, destDir)

      // const child = spawn('npm', ['install'], { 
      //   cwd: destDir, 
      //   stdio: 'inherit',
      //   env: process.env
      // })
      // child.on('error', err => {
      //   console.log('error ' + error)
      // })
      // child.on('close', (code, sig) => {
      //   console.log('close : ', code, sig)
      //   if (code !== 0) {

      //   } else {

      //   }
      // })



    }).catch(err => {
      console.log('it threw .. ', err)
    })





    

    // // fetch the template to temp
    // let res = fetch('cordova-app-hello-world', tmpDest)
    // console.log('got res ... ', res)

    // res.then(res => {
    //   console.log('res .. ', res)
    // })
    // res.catch(err => {
    //   console.log('err .. ', err)
    // })

    
    // return res

    // let template = '/repos/adobe/cna/runtime-cna-starter' //require.resolve('/repos/adobe/cna/runtime-cna-starter')
    // console.log('template = ' + template)

    // let templateDir = template // getSelfDestructingTempDir()
    // //this.copyTemplateFiles(templateDir, dir)
  }

  async npmInstall(spec, dest, registry) {
    let cmd = 'npm'

    let result = new Promise((resolve, reject) => {
      let env = Object.assign({},process.env)
      env = Object.assign(env,{npm_config_registry:registry}) 
      
      cli.action.start('starting a process')

      const child = spawn(cmd, ['install', spec], { 
        cwd:dest, 
        stdio: 'inherit', 
        env:env
      })
      child.on('error', err => {
        cli.action.stop('failed') 
        reject({ command: `${cmd} ${args.join(' ')}`})
      })
      child.on('close', (code, sig) => {
        console.log('close : ', code, sig)
        if (code !== 0) {
          cli.action.stop('failed') 
          reject({ command: `${cmd} ${args.join(' ')}`})
        } else {
          cli.action.stop() 
          resolve()
        }
      })
    })
    return result
  }

  async copyTemplateFiles(templateDir, projectDir) {
    const dirList = fs.readdirSync(templateDir)
    console.log('dirList = ', dirList)
    // skip directories, and files that are unwanted
    let excludes = ['.git', 'NOTICE', 'LICENSE', 'COPYRIGHT', '.npmignore', '.gitignore', 'node_modules']

    let templateFiles = dirList.filter(value => excludes.indexOf(value) < 0)

    console.log('templateFiles =', templateFiles)
    // Copy each template file after filter
    templateFiles.forEach(f => {
      let srcPath = path.resolve(templateDir, f)
      this.log('copying ', srcPath, ' to ', f)
      fs.copySync(srcPath, path.resolve(projectDir, f))
    })
  }
}

CNACreate.description = `Create a new Cloud Native Application
...
Select options, and go
`

CNACreate.args = [
  {
    name: 'path',
    description: 'Directory to create the app in',
    default: '.',
  },
  {
    name: 'name',
    default: 'MyApp',
  },
]

CNACreate.flags = {
  template: flags.string({
    char: 't',
    description: 'Template starter path, or id',
    default: '@io-dev-tools/runtime-cna-starter'
  }),
  registry: flags.string({
    char:'r',
    description:'Alternate registry to use. Passed into npm as environmental var `npm_config_registry`'
  }),
  verbose: flags.boolean({ char: 'v', description: 'Verbose output' }),
  help: flags.boolean({ char: 'h', description: 'Show help' })
  
}

module.exports = CNACreate
