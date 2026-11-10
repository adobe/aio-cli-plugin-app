/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const BaseCommand = require('../../BaseCommand')
const { Flags, Args } = require('@oclif/core')
const fs = require('fs-extra')
const os = require('node:os')
const path = require('node:path')
const { pipeline } = require('node:stream/promises')
const { setTimeout: delay } = require('node:timers/promises')
const { getAccessToken, getDeployServiceUrl } = require('../../lib/auth-helper')
const { PackHelper } = require('../../lib/pack-helper')
const aioLogger = require('@adobe/aio-lib-core-logging')('@adobe/aio-cli-plugin-app:scan', { provider: 'debug' })

const SCANS_PATH = '/v1/scans'
const SCAN_STATUSES = ['PASSED', 'PASSED_WITH_WARNING', 'FAILED', 'ERROR', 'SKIPPED']

class Scan extends BaseCommand {
  async run () {
    const { args, flags } = await this.parse(Scan)

    aioLogger.debug(`args: ${JSON.stringify(args, null, 2)}`)
    aioLogger.debug(`flags: ${JSON.stringify(flags, null, 2)}`)

    const reportPath = path.resolve(flags.output)
    const { accessToken } = await getAccessToken()

    aioLogger.debug(`Access token obtained: ${Boolean(accessToken)}`)

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aio-app-scan-'))
    const zipPath = path.join(tempDir, `app-${Date.now()}.zip`)
    const controller = new AbortController()
    let timer
    try {
      await new PackHelper(this, { silentLogs: true }).pack({ appPath: args.path, output: zipPath, verbose: flags.verbose })

      timer = setTimeout(() => controller.abort(), flags.timeout * 1000)
      const headers = { Authorization: `Bearer ${accessToken}` }
      const options = { headers, signal: controller.signal }
      const deployServiceUrl = getDeployServiceUrl().replace(/\/$/, '')
      const scansUrl = `${deployServiceUrl}${SCANS_PATH}`

      // call submit scan API
      const scanId = await this.submitScan(scansUrl, zipPath, options)

      aioLogger.debug(`Submitted scan ID: ${scanId}`)

      // poll for scan result
      const result = await this.pollScan(`${scansUrl}/${encodeURIComponent(scanId)}`, options)
      if (!SCAN_STATUSES.includes(result.status)) {
        throw new Error('There was an error performing the scan(Invalid scan result)')
      }

      this.log(`Scan status: ${result.status}`)
      if (result.message) this.log(result.message)
      if (result.summary) this.log(`Scan summary:\n${JSON.stringify(result.summary, null, 2)}`)
      if (!result.reportUrl) {
        this.log('No PDF report is available for this scan.')
        return result
      }

      await this.downloadAndSaveReport(result.reportUrl, deployServiceUrl, tempDir, reportPath, options)
      return result
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Scan couldn't be completed at this time. Please try again later or increase the timeout using --timeout <seconds>.")
      }
      throw error
    } finally {
      clearTimeout(timer)
      await fs.remove(tempDir)
    }
  }

  async downloadAndSaveReport (reportUrl, deployServiceUrl, tempDir, reportPath, options) {
    const url = new URL(reportUrl, `${deployServiceUrl}/`).href
    aioLogger.debug(`Downloading scan report from ${url}`)
    let report = await this.request(url, options, [200, 503])
    while (report.status === 503) {
      await this.waitForRetry(report, options.signal)
      aioLogger.debug(`Retrying report download after HTTP 503: ${url}`)
      report = await this.request(url, options, [200, 503])
    }
    const tempReport = path.join(tempDir, 'report.pdf')
    await pipeline(report.body, fs.createWriteStream(tempReport, { mode: 0o600 }), { signal: options.signal })
    await fs.copyFile(tempReport, reportPath)
    this.log(`For more information, please view the detailed report at ${reportPath}`)
  }

  async submitScan (url, zipPath, options) {
    const upload = fs.createReadStream(zipPath)

    aioLogger.debug(`Submitting scan to ${url}`)
    try {
      const submitted = await this.request(url, {
        signal: options.signal,
        method: 'POST',
        headers: { ...options.headers, 'Content-Type': 'application/zip' },
        body: upload,
        duplex: 'half'
      }, [202])
      const { scan_id: scanId } = await submitted.json()
      if (typeof scanId !== 'string' || !scanId) {
        throw new Error('There was an error performing the scan(Invalid scan ID)')
      }
      return scanId
    } finally {
      upload.destroy()
    }
  }

  async request (url, options, allowedStatuses) {
    const response = await fetch(url, { ...options, redirect: 'error' })
    aioLogger.debug(`Scan request response status: ${response.status}`)
    if (!allowedStatuses.includes(response.status)) {
      await response.body?.cancel()
      throw new Error(`Scan request failed (HTTP ${response.status}).`)
    }
    return response
  }

  async pollScan (url, options) {
    while (true) {
      aioLogger.debug(`Polling scan status at ${url}`)
      const response = await this.request(url, options, [200, 202, 429])
      if (response.status === 200) return response.json()

      await this.waitForRetry(response, options.signal)
    }
  }

  async waitForRetry (response, signal) {
    const retryAfter = response.headers.get('retry-after')
    // Convert the retry-after header to milliseconds
    const milliseconds = /^\d+$/.test(retryAfter)
      ? Number(retryAfter) * 1000
      : Date.parse(retryAfter) - Date.now()
    await response.body?.cancel()
    const wait = Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 1000
    const retryDelay = Math.min(wait, 2 ** 31 - 1)
    aioLogger.debug(`Waiting ${retryDelay} ms before retrying`)
    await delay(retryDelay, undefined, { signal })
  }
}

Scan.description = 'Scan an app package for malware and download its PDF report when available'
Scan.flags = {
  ...BaseCommand.flags,
  output: Flags.string({
    description: 'PDF report output path (overwrites an existing file)',
    char: 'o',
    default: 'report.pdf'
  }),
  timeout: Flags.integer({
    description: 'Timeout in seconds for submission, polling and report download',
    default: 600,
    min: 1,
    max: 2147483
  })
}

Scan.args = {
  path: Args.string({
    description: 'Path to the app directory to scan',
    default: '.'
  })
}

module.exports = Scan
