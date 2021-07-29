// include indexes
const appNoActionsIncludeIndex = {
  application: {
    file: 'app.config.yaml',
    key: 'application'
  },
  'application.hooks': {
    file: 'app.config.yaml',
    key: 'application.hooks'
  },
  'application.hooks.pre-app-run': {
    file: 'app.config.yaml',
    key: 'application.hooks.pre-app-run'
  }
}

const appIncludeIndex = {
  application: {
    file: 'app.config.yaml',
    key: 'application'
  },
  'application.runtimeManifest': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest'
  },
  'application.runtimeManifest.packages': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages'
  },
  'application.runtimeManifest.packages.my-app-package': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package'
  },
  'application.runtimeManifest.packages.my-app-package.dependencies': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.dependencies'
  },
  'application.runtimeManifest.packages.my-app-package.dependencies.dependency1': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.dependencies.dependency1'
  },
  'application.runtimeManifest.packages.my-app-package.dependencies.dependency1.location': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.dependencies.dependency1.location'
  },
  'application.runtimeManifest.packages.my-app-package.apis': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.apis'
  },
  'application.runtimeManifest.packages.my-app-package.apis.api1': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.apis.api1'
  },
  'application.runtimeManifest.packages.my-app-package.apis.api1.base': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.apis.api1.base'
  },
  'application.runtimeManifest.packages.my-app-package.apis.api1.base.path': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.apis.api1.base.path'
  },
  'application.runtimeManifest.packages.my-app-package.apis.api1.base.path.action': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.apis.api1.base.path.action'
  },
  'application.runtimeManifest.packages.my-app-package.apis.api1.base.path.action.method': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.apis.api1.base.path.action.method'
  },
  'application.runtimeManifest.packages.my-app-package.rules': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.rules'
  },
  'application.runtimeManifest.packages.my-app-package.rules.rule1': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.rules.rule1'
  },
  'application.runtimeManifest.packages.my-app-package.rules.rule1.rule': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.rules.rule1.rule'
  },
  'application.runtimeManifest.packages.my-app-package.rules.rule1.action': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.rules.rule1.action'
  },
  'application.runtimeManifest.packages.my-app-package.rules.rule1.trigger': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.rules.rule1.trigger'
  },
  'application.runtimeManifest.packages.my-app-package.triggers': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.triggers'
  },
  'application.runtimeManifest.packages.my-app-package.triggers.trigger1': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.triggers.trigger1'
  },
  'application.runtimeManifest.packages.my-app-package.sequences': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.sequences'
  },
  'application.runtimeManifest.packages.my-app-package.sequences.action-sequence': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.sequences.action-sequence'
  },
  'application.runtimeManifest.packages.my-app-package.sequences.action-sequence.web': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.sequences.action-sequence.web'
  },
  'application.runtimeManifest.packages.my-app-package.sequences.action-sequence.actions': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.sequences.action-sequence.actions'
  },
  'application.runtimeManifest.packages.my-app-package.actions': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action-zip': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action-zip'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action-zip.runtime': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action-zip.runtime'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action-zip.web': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action-zip.web'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action-zip.function': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action-zip.function'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.limits': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.limits'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.limits.concurrency': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.limits.concurrency'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.include': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.include'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.include.0.0': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.include.0.0'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.include.0.1': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.include.0.1'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.include.0': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.include.0'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.annotations': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.annotations'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.annotations.final': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.annotations.final'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.annotations.require-adobe-auth': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.annotations.require-adobe-auth'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.inputs': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.inputs'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.inputs.LOG_LEVEL': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.inputs.LOG_LEVEL'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.runtime': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.runtime'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.web': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.web'
  },
  'application.runtimeManifest.packages.my-app-package.actions.action.function': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.actions.action.function'
  },
  'application.runtimeManifest.packages.my-app-package.license': {
    file: 'app.config.yaml',
    key: 'application.runtimeManifest.packages.my-app-package.license'
  },
  'application.hooks': {
    file: 'app.config.yaml',
    key: 'application.hooks'
  },
  'application.hooks.post-app-run': {
    file: 'app.config.yaml',
    key: 'application.hooks.post-app-run'
  },
  'application.actions': {
    file: 'app.config.yaml',
    key: 'application.actions'
  }
}

const excIncludeIndex = {
  extensions: {
    file: 'app.config.yaml',
    key: 'extensions'
  },
  'extensions.dx/excshell/1': {
    file: 'app.config.yaml',
    key: 'extensions.dx/excshell/1'
  },
  'extensions.dx/excshell/1.$include': {
    file: 'app.config.yaml',
    key: 'extensions.dx/excshell/1.$include'
  },
  'extensions.dx/excshell/1.runtimeManifest': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.limits': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.limits'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.limits.concurrency': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.limits.concurrency'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.include'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include.0.1': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.include.0.1'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include.0.0': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.include.0.0'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include.0': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.include.0'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.annotations': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.annotations'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.annotations.final': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.annotations.final'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.annotations.require-adobe-auth': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.annotations.require-adobe-auth'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.inputs': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.inputs'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.inputs.LOG_LEVEL': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.inputs.LOG_LEVEL'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.runtime': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.runtime'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.web': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.web'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.function': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.actions.action.function'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.license': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-exc-package.license'
  },
  'extensions.dx/excshell/1.web': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'web'
  },
  'extensions.dx/excshell/1.actions': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'actions'
  },
  'extensions.dx/excshell/1.operations': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations'
  },
  'extensions.dx/excshell/1.operations.view': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view'
  },
  'extensions.dx/excshell/1.operations.view.0': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view.0'
  },
  'extensions.dx/excshell/1.operations.view.0.impl': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view.0.impl'
  },
  'extensions.dx/excshell/1.operations.view.0.type': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view.0.type'
  }
}

const appExcNuiIncludeIndex = {
  ...appIncludeIndex,
  ...excIncludeIndex,
  'extensions.dx/asset-compute/worker/1': {
    file: 'app.config.yaml',
    key: 'extensions.dx/asset-compute/worker/1'
  },
  'extensions.dx/asset-compute/worker/1.$include': {
    file: 'app.config.yaml',
    key: 'extensions.dx/asset-compute/worker/1.$include'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.limits': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.limits'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.limits.concurrency': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.limits.concurrency'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.include': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.include'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.include.0.0': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.include.0.0'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.include.0.1': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.include.0.1'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.include.0': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.include.0'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.annotations': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.annotations'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.annotations.final': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.annotations.final'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.annotations.require-adobe-auth': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.annotations.require-adobe-auth'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.inputs': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.inputs'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.inputs.LOG_LEVEL': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.inputs.LOG_LEVEL'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.runtime': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.runtime'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.web': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.web'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.actions.action.function': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.actions.action.function'
  },
  'extensions.dx/asset-compute/worker/1.runtimeManifest.packages.my-nui-package.license': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'runtimeManifest.packages.my-nui-package.license'
  },
  'extensions.dx/asset-compute/worker/1.hooks': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'hooks'
  },
  'extensions.dx/asset-compute/worker/1.hooks.post-app-run': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'hooks.post-app-run'
  },
  'extensions.dx/asset-compute/worker/1.actions': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'actions'
  },
  'extensions.dx/asset-compute/worker/1.operations': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'operations'
  },
  'extensions.dx/asset-compute/worker/1.operations.workerProcess': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'operations.workerProcess'
  },
  'extensions.dx/asset-compute/worker/1.operations.workerProcess.0': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'operations.workerProcess.0'
  },
  'extensions.dx/asset-compute/worker/1.operations.workerProcess.0.impl': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'operations.workerProcess.0.impl'
  },
  'extensions.dx/asset-compute/worker/1.operations.workerProcess.0.type': {
    file: 'src/dx-asset-compute-worker-1/ext.config.yaml',
    key: 'operations.workerProcess.0.type'
  }
}

const legacyIncludeIndex = {
  'application.actions': {
    file: '.aio',
    key: 'app.actions'
  },
  'application.runtimeManifest': {
    file: 'manifest.yml',
    key: ''
  },
  'application.runtimeManifest.packages': {
    file: 'manifest.yml',
    key: 'packages'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.dependencies': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.dependencies'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.dependencies.dependency1': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.dependencies.dependency1'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.dependencies.dependency1.location': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.dependencies.dependency1.location'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.apis': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.apis'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.apis.api1': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.apis.api1'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.apis.api1.base': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.apis.api1.base'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.apis.api1.base.path': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.apis.api1.base.path'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.apis.api1.base.path.action': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.apis.api1.base.path.action'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.apis.api1.base.path.action.method': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.apis.api1.base.path.action.method'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.rules': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.rules'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.rules.rule1': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.rules.rule1'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.rules.rule1.rule': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.rules.rule1.rule'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.rules.rule1.action': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.rules.rule1.action'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.rules.rule1.trigger': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.rules.rule1.trigger'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.triggers': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.triggers'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.triggers.trigger1': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.triggers.trigger1'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.sequences': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.sequences'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.sequences.action-sequence': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.sequences.action-sequence'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.sequences.action-sequence.web': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.sequences.action-sequence.web'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.sequences.action-sequence.actions': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.sequences.action-sequence.actions'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action-zip': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action-zip'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action-zip.runtime': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action-zip.runtime'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action-zip.web': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action-zip.web'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action-zip.function': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action-zip.function'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.limits': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.limits'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.limits.concurrency': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.limits.concurrency'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.include': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.include'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.include.0': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.include.0'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.include.0.1': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.include.0.1'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.include.0.0': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.include.0.0'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.annotations': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.annotations'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.annotations.final': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.annotations.final'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.annotations.require-adobe-auth': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.annotations.require-adobe-auth'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.inputs': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.inputs'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.inputs.LOG_LEVEL': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.inputs.LOG_LEVEL'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.runtime': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.runtime'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.web': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.web'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.actions.action.function': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.actions.action.function'
  },
  'application.runtimeManifest.packages.__APP_PACKAGE__.license': {
    file: 'manifest.yml',
    key: 'packages.__APP_PACKAGE__.license'
  },
  'application.hooks': {
    file: 'package.json',
    key: 'scripts'
  },
  'application.hooks.post-app-run': {
    file: 'package.json',
    key: 'scripts.post-app-run'
  },
  application: {
    file: '.aio',
    key: 'app'
  }
}

const excComplexIncludeIndex = {
  extensions: {
    file: 'app.config.yaml',
    key: 'extensions'
  },
  'extensions.$include': {
    file: 'app.config.yaml',
    key: 'extensions.$include'
  },
  'extensions.dx/excshell/1': {
    file: 'app.config2.yaml',
    key: 'dx/excshell/1'
  },
  'extensions.dx/excshell/1.$include': {
    file: 'app.config2.yaml',
    key: 'dx/excshell/1.$include'
  },
  'extensions.dx/excshell/1.runtimeManifest': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest'
  },
  'extensions.dx/excshell/1.runtimeManifest.$include': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'runtimeManifest.$include'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages': {
    file: 'src/dx-excshell-1/actions/pkg.manifest.yaml',
    key: 'packages'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package': {
    file: 'src/dx-excshell-1/actions/pkg.manifest.yaml',
    key: 'packages.my-exc-package'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions': {
    file: 'src/dx-excshell-1/actions/pkg.manifest.yaml',
    key: 'packages.my-exc-package.actions'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.$include': {
    file: 'src/dx-excshell-1/actions/pkg.manifest.yaml',
    key: 'packages.my-exc-package.actions.$include'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.limits': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.limits'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.limits.concurrency': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.limits.concurrency'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.include'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include.0': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.include.0'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include.0.1': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.include.0.1'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.include.0.0': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.include.0.0'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.annotations': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.annotations'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.annotations.final': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.annotations.final'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.annotations.require-adobe-auth': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.annotations.require-adobe-auth'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.inputs': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.inputs'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.inputs.LOG_LEVEL': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.inputs.LOG_LEVEL'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.runtime': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.runtime'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.web': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.web'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.actions.action.function': {
    file: 'src/dx-excshell-1/actions/sub/action.manifest.yaml',
    key: 'action.function'
  },
  'extensions.dx/excshell/1.runtimeManifest.packages.my-exc-package.license': {
    file: 'src/dx-excshell-1/actions/pkg.manifest.yaml',
    key: 'packages.my-exc-package.license'
  },
  'extensions.dx/excshell/1.web': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'web'
  },
  'extensions.dx/excshell/1.actions': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'actions'
  },
  'extensions.dx/excshell/1.operations': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations'
  },
  'extensions.dx/excshell/1.operations.view': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view'
  },
  'extensions.dx/excshell/1.operations.view.0': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view.0'
  },
  'extensions.dx/excshell/1.operations.view.0.impl': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view.0.impl'
  },
  'extensions.dx/excshell/1.operations.view.0.type': {
    file: 'src/dx-excshell-1/ext.config.yaml',
    key: 'operations.view.0.type'
  }
}

module.exports = {
  excComplexIncludeIndex,
  appExcNuiIncludeIndex,
  appIncludeIndex,
  appNoActionsIncludeIndex,
  excIncludeIndex,
  legacyIncludeIndex
}
