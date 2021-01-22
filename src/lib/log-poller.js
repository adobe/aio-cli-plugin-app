/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const EventEmitter = require('events')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:log-poller', { provider: 'debug' })
const { printActionLogs } = require('@adobe/aio-lib-runtime')

const FETCH_LOG_INTERVAL = 10000

/**
 * @typedef {object} LogPollerObject
 * @property {object} poller the EventPoller instance
 * @property {Function} cleanup callback function to cleanup available resources
 */

/**
 * @typedef {object} PollArgs
 * @property {object} config the app config (see src/lib/config-loader.js)
 * @property {object} poller the EventPoller instance
 * @property {object} logOptions log options
 * @property {number} logOptions.limit the number of logs to return
 * @property {number} logOptions.startTime only return logs later than this startTime date
 */

/**
 * Class EventPoller.
 */
class EventPoller extends EventEmitter {
  constructor (timeout) {
    super()
    this.timeout = timeout
    this.timeoutId = null
  }

  stop () {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
  }

  start (args) {
    this.stop()
    // emit event after poll interval
    this.timeoutId = setTimeout(() => this.emit('poll', args), this.timeout)
  }

  onPoll (callback) {
    this.on('poll', callback)
  }
}

/**
 * The function that is run on each poll tick.
 *
 * @param {PollArgs} pollArgs the poll arguments
 */
async function logListener (pollArgs) {
  const { poller } = pollArgs
  const { limit, startTime } = pollArgs.logOptions
  try {
    const { lastActivationTime } = await printActionLogs(pollArgs.config, console.log, limit || 1, [], false, false, undefined, startTime)
    pollArgs.logOptions = {
      limit: 30,
      startTime: lastActivationTime
    }
  } catch (e) {
    aioLogger.error('Error while fetching action logs ' + e)
  } finally {
    poller.start(pollArgs)
  }
}

/**
 *  Run the log poller.
 *
 * @param {object} config the app config (see src/lib/config-loader.js)
 * @param {number} logInterval the number of seconds to poll
 * @returns {LogPollerObject} the LogPoller object
 */
const run = async (config, logInterval = FETCH_LOG_INTERVAL) => {
  const poller = new EventPoller(logInterval)
  poller.onPoll(logListener)

  const pollArgs = {
    config,
    poller,
    logOptions: {
      startTime: Date.now()
    }
  }
  poller.start(pollArgs)

  const cleanup = () => {
    aioLogger.debug('stopping event poller...')
    poller.stop()
  }

  return {
    poller,
    cleanup
  }
}

module.exports = {
  EventPoller,
  run
}
