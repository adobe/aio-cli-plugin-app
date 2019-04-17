

const path = require('path')
const fs = require('fs-extra')
const resolve = require('resolve')
const npa = require('npm-package-arg')
const semver = require('semver')
const spawn = require('cross-spawn')
const which = require('which')

/**
 * Installs a module from npm, a git url or the local file system.
 *
 * @param {String} target       A spec for the package to be installed
 *                              (anything supported by `npm install`)
 * @param {String} dest         Location where to install the package
 * @param {Object} [opts={}]    Additional options
 *
 * @return {Promise<string>}    Absolute path to the installed package
 */
module.exports = function (target, dest, opts = {}) {
  return Promise.resolve()
  .then(function () {
    if (!dest || !target) {
      throw new Error('Need to supply a target and destination')
    }
    // Create dest if it doesn't exist yet
    fs.ensureDirSync(dest)
  })
  .then(_ => {
    return pathToInstalledPackage(target, dest)
    .catch(_ => {
        installPackage(target, dest, opts)
    })
  })
}

function isNpmInstalled() {
  return which.sync('npm', {nothrow: true}) !== null
}

// Installs the package specified by target and returns the installation path
function installPackage(target, dest, opts) {
  let hasNpm = isNpmInstalled()
  if(!hasNpm) {
    console.error('npm is not installed')
    return
  }
  // Ensure that `npm` installs to `dest` and not any of its ancestors
  fs.ensureDirSync(path.join(dest, 'node_modules'))

  // Run `npm` to install requested package
  let args = npmArgs(target, opts)

  console.log(`fetch: Installing ${target} to ${dest}`)

  // TODO: yarn ?

  let cmd = 'npm'
  result = new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {cwd: dest, stdio: 'inherit'})
    child.on('error', err => {
        console.log('err ' + err)
    })
    child.on('close', (code, sig) => {
      if (code !== 0) {
        reject({ command: `${cmd} ${args.join(' ')}`})
      } else {
        resolve()
      }
    })
  })

  // Resolve path to installed package
  result.then(async () => {
    const dirList = await fs.readdirSync(dest + '/node_modules')
    console.log('dirList ', dirList)
  })
//   .then(spec => pathToInstalledPackage(spec, dest))
  return result
}

function npmArgs(target, userOptions) {
  const opts = Object.assign({ production: true }, userOptions)

  const args = ['install', target]

  if (opts.production) {
    args.push('--production')
  }
  if (opts.save_exact) {
    args.push('--save-exact')
  } else if (opts.save) {
    args.push('--save')
  } else {
    args.push('--no-save')
  }
  return args
}

// function getTargetPackageSpecFromNpmInstallOutput(npmInstallOutput) {
//   const lines = npmInstallOutput.split('\n')
//   for (let i = 0; i < lines.length; i++) {
//     if (lines[i].startsWith('+ ')) {
//       // npm >= 5
//       return lines[i].slice(2)
//     }
//     // else if (lines[i].startsWith('└─') || lines[i].startsWith('`-')) {
//     //   // 3 <= npm <= 4
//     //   return lines[i].slice(4).split(' ')[0]
//     // }
//   }
//   throw new Error('Could not determine package name from output:\n' + npmInstallOutput)
// }

// Resolves to installation path of package defined by spec if the right version
// is installed, rejects otherwise.
function pathToInstalledPackage(spec, dest) {
  return Promise.resolve().then(_ => {
    let res = npa(spec, dest);
    const { name, rawSpec } = npa(spec, dest)
    if (!name) {
      throw new Error(`Cannot determine package name from spec ${spec}`)
    }
    return resolvePathToPackage(name, dest)
    .then(([pkgPath, {version}]) => {
      if (!semver.satisfies(version, rawSpec)) {
        throw new Error(`Installed package ${name}@${version} does not satisfy ${name}@${rawSpec}`)
      }
      return pkgPath
    })
  })
}

// Resolves to installation path and package.json of package `name` starting
// from `basedir`
function resolvePathToPackage(name, basedir) {
  return Promise.resolve().then(_ => {
    const paths = (process.env.NODE_PATH || '')
    .split(path.delimiter)
    .filter(p => p)

    // We resolve the path to the module's package.json to avoid getting the
    // path to `main` which could be located anywhere in the package
    let res = resolve.sync(path.join(name, 'package.json'), {paths, basedir})
    return [path.dirname(res.pkgJsonPath), res.pkgJson]
  })
}


/**
 * Uninstalls the package `target` from `dest` using given options.
 *
 * @param {String} target       Name of the package to be uninstalled
 * @param {String} dest         Location from where to uninstall the package
 * @param {Object} [opts={}]    Additional options
 *
 * @return {Promise<string>}    Resolves when removal has finished
 */
module.exports.uninstall = function (target, dest, opts) {
  var fetchArgs = ['uninstall']
  opts = opts || {}

  // check if npm is installed on the system
  return isNpmInstalled()
  .then(function () {
    if (dest && target) {
      // add target to fetchArgs Array
      fetchArgs.push(target)
    } else throw new Error('Need to supply a target and destination')

    // set the directory where npm uninstall will be run
    opts.cwd = dest

    // if user added --save flag, pass it to npm uninstall command
    if (opts.save) {
      fetchArgs.push('--save')
    } else {
      fetchArgs.push('--no-save')
    }

    // run npm uninstall, this will remove dependency
    // from package.json if --save was used.
    return spawn('npm', fetchArgs, opts)
  })
}