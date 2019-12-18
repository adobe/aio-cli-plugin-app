import config from './config.json'
import React from 'react'
import ReactDOM from 'react-dom'


(function(e,t){if(t.location===t.parent.location)throw new Error("Module Runtime: Needs to be within an iframe!");var o=function(e){var t=new URL(e.location.href).searchParams.get("_mr");return t||!e.EXC_US_HMR?t:e.sessionStorage.getItem("unifiedShellMRScript")}(t);if(!o)throw new Error("Module Runtime: Missing script!");if("https:"!==(o=new URL(decodeURIComponent(o))).protocol)throw new Error("Module Runtime: Must be HTTPS!");if(!/experience(-qa|-stage)?\.adobe\.com$/.test(o.hostname)&&!/localhost\.corp\.adobe\.com$/.test(o.hostname))throw new Error("Module Runtime: Invalid domain!");if(!/\.js$/.test(o.pathname))throw new Error("Module Runtime: Must be a JavaScript file!");t.EXC_US_HMR&&t.sessionStorage.setItem("unifiedShellMRScript",o.toString());var n=e.createElement("script");n.async=1,n.src=o.toString(),n.onload=n.onreadystatechange=function(){n.readyState&&!/loaded|complete/.test(n.readyState)||(n.onload=n.onreadystatechange=null,n=void 0,"EXC_MR_READY"in t&&t.EXC_MR_READY())},e.head.appendChild(n)})(document,window);

import App from './App'

function bootstrap () {
  const Runtime = window['exc-module-runtime'].default
  const runtime = new Runtime({ canTakeover: true })

  window.runtime = runtime
  runtime.customEnvLabel = 'My Apps'


  ReactDOM.render(<App runtime={runtime}/>, document.getElementById('root'))

  runtime.favicon = 'https://emoji.slack-edge.com/T23RE8G4F/jaeger/be22c0948432ee19.jpg'
  runtime.heroClick = () => window.alert('Did I ever tell you you\'re my hero?')

  runtime.on('ready', ({ imsOrg, imsToken, imsProfile, locale }) => {
    console.log('Ready! received imsProfile:', imsProfile)
    window.imsProfile = imsProfile
    // displayName
    // this.setState({
    //   imsOrg,
    //   imsToken,
    //   loading: false,
    //   locale
    // });
  })

  runtime.historyChange = path => {
    console.log('history changed :: ', path)
    // this.history.replace(path)
    // this.setState({currentPath: `/${path}`})
  }

  runtime.solution = {
    icon: 'AdobeExperienceCloud',
    title: 'MyApps - Jaeger Apps',
    shortTitle: 'JGR'
  }
  runtime.title = '<%= package_name %>'
  window.alert('loaded with a title')
  runtime.done()
}

if ('exc-module-runtime' in window) {
  bootstrap()
} else {
  window.EXC_MR_READY = () => bootstrap()
}
