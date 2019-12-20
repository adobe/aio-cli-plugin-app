import React from 'react'
import PropTypes from 'prop-types'
import ErrorBoundary from 'react-error-boundary'

import actions from './config.json'

export default class App extends React.Component {
  constructor (props) {
    super(props)

    console.log('actions.list = ', actions.list)
    console.log('actions = ', actions.resolver)

    // error handler on UI rendering failure
    this.onError = (e, componentStack) => {}

    // component to show if UI fails rendering
    this.fallbackComponent = ({ componentStack, error }) => (
      <React.Fragment>
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>Something went wrong :(</h1>
        <pre>{ componentStack + '\n' + error.message }</pre>
      </React.Fragment>
    )
  }

  static get propTypes () {
    return {
      runtime: PropTypes.any
    }
  }

  render () {
    return (
      <ErrorBoundary onError={this.onError} FallbackComponent={this.fallbackComponent} >
        <h1><%= package_name %></h1>
        <pre>this.props.runtime &eq;{JSON.stringify(this.props.runtime, 0, '\t')}</pre>
      </ErrorBoundary>
    )
  }
}
