
/*
  This is a basic template definition ( for now )
  in the future, a template could have additional steps, like a post-install script to call or something
  templates could also define different locations of their 'meat', currently the 'path' value is expected
  to point towards a relative folder containing the template files
*/
module.exports = {
  'basic-action-view-app': {
    description: 'the most basic of the basics',
    path: 'basic-action-view-app'
  },
  'basic-action-view-app2': {
    description: 'the 2nd most basic of the basics',
    path: 'basic-action-view-app'
  },
  'basic-action-view-app3': {
    description: 'the 3rd most basic of the basics',
    path: 'basic-action-view-app'
  }
}