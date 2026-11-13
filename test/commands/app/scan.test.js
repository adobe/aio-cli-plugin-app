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

const Scan = require('../../../src/commands/app/scan')
const { getAccessToken, getDeployServiceUrl } = require('../../../src/lib/auth-helper')
const { PackHelper } = require('../../../src/lib/pack-helper')
const fs = require('fs-extra')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const { setTimeout: delay } = require('node:timers/promises')

jest.mock('../../../src/lib/auth-helper')
jest.mock('../../../src/lib/pack-helper')
jest.mock('@adobe/aio-cli-lib-console', () => ({}))
jest.mock('node:timers/promises', () => ({
  ...jest.requireActual('node:timers/promises'),
  setTimeout: jest.fn()
}))

const originalFetch = global.fetch
const reportUrl = '/v1/scans/scan-id/report'
const scansUrl = 'https://deploy.example.test/v1/scans'
const timeoutMessage = "Scan couldn't be completed at this time. Please try again later or increase the timeout using --timeout <seconds>."
let command, workDir, zipPath, outputPath, pack

const json = (body, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(async () => {
  delay.mockReset().mockImplementation(jest.requireActual('node:timers/promises').setTimeout)
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aio-scan-test-'))
  outputPath = path.join(workDir, 'report.pdf')
  zipPath = undefined
  command = new Scan()
  command.config = createOclifMockConfig()
  command.argv = ['--output', outputPath]
  command.log = jest.fn()
  getAccessToken.mockResolvedValue({ accessToken: 'test-token' })
  getDeployServiceUrl.mockReturnValue('https://deploy.example.test/')
  pack = jest.fn(async ({ output }) => {
    zipPath = output
    await fs.writeFile(zipPath, 'package contents')
  })
  PackHelper.mockImplementation(() => ({ pack }))
  global.fetch = jest.fn()
    .mockResolvedValueOnce(json({ scan_id: 'scan-id' }, 202))
    .mockResolvedValueOnce(json({ status: 'FAILED', reportUrl }))
    .mockResolvedValueOnce(new Response('%PDF-test-report'))
})

afterEach(async () => {
  jest.useRealTimers()
  jest.restoreAllMocks()
  global.fetch = originalFetch
  await fs.remove(workDir)
})

test('packages, streams the ZIP, polls and saves the PDF without changing the app directory', async () => {
  command.argv.push('--verbose')
  await expect(command.run()).resolves.toEqual({ status: 'FAILED', reportUrl })

  expect(PackHelper).toHaveBeenCalledWith(command, { silentLogs: true })
  expect(pack).toHaveBeenCalledWith({ appPath: '.', output: zipPath, verbose: true })
  expect(command.config.runCommand).not.toHaveBeenCalled()
  expect(path.basename(zipPath)).toMatch(/^app-\d+\.zip$/)
  expect(global.fetch).toHaveBeenNthCalledWith(1, scansUrl, expect.objectContaining({
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/zip' },
    body: expect.objectContaining({ path: zipPath }),
    duplex: 'half',
    redirect: 'error'
  }))
  expect(global.fetch).toHaveBeenNthCalledWith(2, `${scansUrl}/scan-id`, expect.objectContaining({
    headers: { Authorization: 'Bearer test-token' }
  }))
  expect(global.fetch).toHaveBeenNthCalledWith(3, `${scansUrl}/scan-id/report`, expect.objectContaining({
    headers: { Authorization: 'Bearer test-token' },
    redirect: 'error'
  }))
  expect(await fs.readFile(outputPath, 'utf8')).toBe('%PDF-test-report')
  expect(command.log).toHaveBeenCalledWith(`For more information, please view the detailed report at ${outputPath}`)
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test.each([1794540000000, 1794540001000])('defaults the report path to the current timestamp %s', timestamp => {
  jest.spyOn(Date, 'now').mockReturnValue(timestamp)
  expect(command.getReportPath(undefined, null, process.cwd())).toBe(path.resolve(`scan-report-${timestamp}.pdf`))
})

test.each([
  '',
  '.',
  'report\u0000.pdf',
  'report\n.pdf',
  'report\t.pdf',
  'report\u007f.pdf'
])('falls back for an unusable report filename %j', filename => {
  jest.spyOn(Date, 'now').mockReturnValue(1794540000000)
  expect(command.getReportPath(undefined, `attachment; filename="${filename}"`, workDir))
    .toBe(path.join(workDir, 'scan-report-1794540000000.pdf'))
})

test.each([
  'scan report.pdf',
  'rapport-\u00e9.pdf'
])('preserves a valid report filename %j', filename => {
  expect(command.getReportPath(undefined, `attachment; filename="${filename}"`, workDir))
    .toBe(path.join(workDir, filename))
})

test.each([
  [[], 'attachment; filename="server-report.pdf"', 'server-report.pdf'],
  [[], 'attachment; filename=server-report.pdf', 'server-report.pdf'],
  [[], '', 'scan-report-1794540000000.pdf'],
  [[], null, 'scan-report-1794540000000.pdf'],
  [[], 'attachment; filename="../../server-report.pdf"', 'server-report.pdf'],
  [[], 'attachment; filename=".."', 'scan-report-1794540000000.pdf'],
  [['--output', 'custom.pdf'], 'attachment; filename="server-report.pdf"', 'custom.pdf'],
  [['-o', 'custom.pdf'], 'attachment; filename="server-report.pdf"', 'custom.pdf'],
  [['--output=custom.pdf'], 'attachment; filename="server-report.pdf"', 'custom.pdf']
])('selects report output for flags %j and header %j', async (argv, disposition, filename) => {
  const initialCwd = process.cwd()
  const appPath = path.join(workDir, 'app')
  await fs.ensureDir(appPath)
  jest.spyOn(Date, 'now').mockReturnValue(1794540000000)
  command.argv = [appPath, ...argv]
  pack.mockImplementation(async ({ output }) => {
    process.chdir(appPath)
    zipPath = output
    await fs.writeFile(zipPath, 'package contents')
  })
  global.fetch.mockReset()
    .mockResolvedValueOnce(json({ scan_id: 'scan-id' }, 202))
    .mockResolvedValueOnce(json({ status: 'FAILED', reportUrl }))
    .mockResolvedValueOnce(new Response('%PDF-report', {
      headers: disposition === null ? {} : { 'Content-Disposition': disposition }
    }))
  try {
    process.chdir(workDir)
    const savedPath = path.join(process.cwd(), filename)
    await command.run()
    expect(await fs.readFile(savedPath, 'utf8')).toBe('%PDF-report')
    expect(command.log).toHaveBeenCalledWith(`For more information, please view the detailed report at ${savedPath}`)
  } finally {
    process.chdir(initialCwd)
  }
})

test('scans the supplied app path and resolves report output before changing directories', async () => {
  const initialCwd = process.cwd()
  const appPath = path.join(workDir, 'app')
  await fs.ensureDir(appPath)
  command.argv = [appPath, '--output', path.relative(initialCwd, outputPath)]
  pack.mockImplementation(async ({ appPath, output }) => {
    process.chdir(appPath)
    zipPath = output
    await fs.writeFile(zipPath, 'package contents')
  })
  try {
    await command.run()
    expect(pack).toHaveBeenCalledWith({ appPath, output: zipPath, verbose: undefined })
    expect(await fs.readFile(outputPath, 'utf8')).toBe('%PDF-test-report')
    expect(command.log).toHaveBeenCalledWith(`For more information, please view the detailed report at ${outputPath}`)
  } finally {
    process.chdir(initialCwd)
  }
})

test('streams ZIP bytes and downloads the report over HTTP', async () => {
  const requests = []
  const server = http.createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    requests.push({ method: request.method, url: request.url, headers: request.headers, body: Buffer.concat(chunks).toString() })
    response.setHeader('Content-Type', 'application/json')
    if (request.method === 'POST') {
      response.writeHead(202).end(JSON.stringify({ scan_id: 'scan-id' }))
    } else if (request.url.endsWith('/report')) {
      response.setHeader('Content-Type', 'application/pdf')
      response.end('%PDF-network-report')
    } else {
      response.end(JSON.stringify({ status: 'FAILED', reportUrl }))
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    getDeployServiceUrl.mockReturnValue(`http://127.0.0.1:${server.address().port}`)
    global.fetch = originalFetch
    await command.run()
    expect(requests.map(({ method, url }) => [method, url])).toEqual([
      ['POST', '/v1/scans'], ['GET', '/v1/scans/scan-id'], ['GET', reportUrl]
    ])
    expect(requests[0].body).toBe('package contents')
    expect(requests[0].headers['content-type']).toBe('application/zip')
    expect(requests[2].headers['x-api-key']).toBeUndefined()
    expect(requests.map(({ headers }) => headers.authorization)).toEqual(Array(3).fill('Bearer test-token'))
    expect(await fs.readFile(outputPath, 'utf8')).toBe('%PDF-network-report')
    expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})

test.each([
  [202, '7'],
  [202, 'Thu, 05 Nov 2026 08:00:07 GMT'],
  [202, null],
  [202, 'invalid'],
  [202, '0'],
  [429, '1'],
  [429, null]
])('honors HTTP %s Retry-After %s without parsing the response body', async (status, retryAfter) => {
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-05T08:00:00Z').getTime())
  delay.mockResolvedValue(undefined)
  global.fetch.mockReset()
    .mockResolvedValueOnce(new Response(null, {
      status,
      headers: retryAfter === null ? {} : { 'Retry-After': retryAfter }
    }))
    .mockResolvedValueOnce(json({ status: 'PASSED' }))
  const signal = new AbortController().signal
  const wait = retryAfter === '0' ? 0 : ['7', 'Thu, 05 Nov 2026 08:00:07 GMT'].includes(retryAfter) ? 7000 : 1000
  await expect(command.pollScan(`${scansUrl}/scan-id`, { signal })).resolves.toEqual({ status: 'PASSED' })
  expect(delay).toHaveBeenCalledTimes(1)
  expect(delay).toHaveBeenCalledWith(wait, undefined, { signal })
  expect(global.fetch).toHaveBeenCalledTimes(2)
})

test.each(['PASSED', 'SKIPPED', 'ERROR'])('handles %s with no report', async status => {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 }
  global.fetch.mockReset()
    .mockResolvedValueOnce(json({ scan_id: 'DUMMY_SCAN_ID' }, 202))
    .mockResolvedValueOnce(json({ status, message: 'Scan result message', summary, reportUrl: '' }))
  await expect(command.run()).resolves.toEqual({ status, message: 'Scan result message', summary, reportUrl: '' })
  expect(global.fetch).toHaveBeenCalledTimes(2)
  expect(command.log).toHaveBeenCalledWith(`Scan status: ${status}`)
  expect(command.log).toHaveBeenCalledWith('Scan result message')
  expect(command.log).toHaveBeenCalledWith(`Scan summary:\n${JSON.stringify(summary, null, 2)}`)
  expect(command.log).toHaveBeenCalledWith('No PDF report is available for this scan.')
  expect(await fs.pathExists(outputPath)).toBe(false)
})

test('overwrites an existing report after downloading the new PDF', async () => {
  await fs.writeFile(outputPath, 'existing report')
  await command.run()
  expect(await fs.readFile(outputPath, 'utf8')).toBe('%PDF-test-report')
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test.each([401, 413, 429, 500, 502, 504])('reports submission HTTP %s and cleans up', async status => {
  global.fetch.mockReset().mockResolvedValue(new Response('error', { status }))
  await expect(command.run()).rejects.toThrow(`Scan request failed (HTTP ${status}).`)
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test.each([
  [new Response('error', { status: 401 }), 'Scan request failed (HTTP 401).'],
  [json({ status: 'unknown' }), 'There was an error performing the scan(Invalid scan result)']
])('rejects unsuccessful or malformed polling responses', async (response, message) => {
  global.fetch.mockReset()
    .mockResolvedValueOnce(json({ scan_id: 'scan-id' }, 202))
    .mockResolvedValueOnce(response)
  await expect(command.run()).rejects.toThrow(message)
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test('rejects a missing scan ID', async () => {
  global.fetch.mockReset().mockResolvedValue(json({}, 202))
  await expect(command.run()).rejects.toThrow('There was an error performing the scan(Invalid scan ID)')
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test('does not submit a scan when packaging fails', async () => {
  pack.mockImplementation(async ({ output }) => {
    zipPath = output
    throw new Error('Packaging failed')
  })
  await expect(command.run()).rejects.toThrow('Packaging failed')
  expect(global.fetch).not.toHaveBeenCalled()
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test('propagates authentication failures before packaging', async () => {
  getAccessToken.mockRejectedValueOnce(new Error('Authentication failed'))
  await expect(command.run()).rejects.toThrow('Authentication failed')
  expect(pack).not.toHaveBeenCalled()
})

test('preserves the existing report when the download fails', async () => {
  await fs.writeFile(outputPath, 'existing report')
  global.fetch.mockReset()
    .mockResolvedValueOnce(json({ scan_id: 'scan-id' }, 202))
    .mockResolvedValueOnce(json({ status: 'PASSED_WITH_WARNING', reportUrl }))
    .mockResolvedValueOnce(new Response(new ReadableStream({
      start (controller) {
        controller.enqueue(Buffer.from('%PDF-partial'))
        controller.error(new Error('Download interrupted'))
      }
    })))
  await expect(command.run()).rejects.toThrow('Download interrupted')
  expect(await fs.readFile(outputPath, 'utf8')).toBe('existing report')
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test.each([403, 404])('surfaces report HTTP %s errors without retrying', async status => {
  global.fetch.mockReset()
    .mockResolvedValueOnce(json({ scan_id: 'scan-id' }, 202))
    .mockResolvedValueOnce(json({ status: 'FAILED', reportUrl }))
    .mockResolvedValueOnce(new Response(null, { status }))
  await expect(command.run()).rejects.toThrow(`Scan request failed (HTTP ${status}).`)
  expect(global.fetch).toHaveBeenCalledTimes(3)
  expect(await fs.pathExists(outputPath)).toBe(false)
})

test.each([
  [503, 503, 200],
  [503, 503, 502],
  [429, 429, 200],
  [429, 503, 200],
  [503, 429, 200]
])('retries HTTP %s then HTTP %s report responses, ending with HTTP %s', async (firstStatus, secondStatus, status) => {
  const unavailable = new Response('Rendering at capacity', {
    status: firstStatus,
    headers: { 'Retry-After': '0' }
  })
  const stillUnavailable = new Response('Still rendering at capacity', {
    status: secondStatus,
    headers: { 'Retry-After': '0' }
  })
  global.fetch.mockReset()
    .mockResolvedValueOnce(json({ scan_id: 'scan-id' }, 202))
    .mockResolvedValueOnce(json({ status: 'FAILED', reportUrl }))
    .mockResolvedValueOnce(unavailable)
    .mockResolvedValueOnce(stillUnavailable)
    .mockResolvedValueOnce(new Response('%PDF-retried-report', { status }))
  const wait = jest.spyOn(command, 'waitForRetry')
  if (status === 200) {
    await command.run()
    expect(await fs.readFile(outputPath, 'utf8')).toBe('%PDF-retried-report')
  } else {
    await expect(command.run()).rejects.toThrow(`Scan request failed (HTTP ${status}).`)
    expect(await fs.pathExists(outputPath)).toBe(false)
  }
  expect(wait).toHaveBeenCalledTimes(2)
  expect(wait).toHaveBeenNthCalledWith(1, unavailable, expect.any(AbortSignal))
  expect(wait).toHaveBeenNthCalledWith(2, stillUnavailable, expect.any(AbortSignal))
  expect(unavailable.bodyUsed).toBe(true)
  expect(stillUnavailable.bodyUsed).toBe(true)
  expect(global.fetch).toHaveBeenCalledTimes(5)
  expect(global.fetch.mock.calls[3]).toEqual(global.fetch.mock.calls[2])
  expect(global.fetch.mock.calls[4]).toEqual(global.fetch.mock.calls[2])
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test.each([429, 503])('times out while waiting to retry an HTTP %s report download', async status => {
  command.argv.push('--timeout', '1')
  global.fetch.mockReset()
    .mockResolvedValueOnce(json({ scan_id: 'scan-id' }, 202))
    .mockResolvedValueOnce(json({ status: 'FAILED', reportUrl }))
    .mockResolvedValueOnce(new Response(null, { status, headers: { 'Retry-After': '0' } }))
    .mockResolvedValueOnce(new Response(null, { status, headers: { 'Retry-After': '60' } }))
  await expect(command.run()).rejects.toThrow(timeoutMessage)
  expect(global.fetch).toHaveBeenCalledTimes(4)
  expect(await fs.pathExists(outputPath)).toBe(false)
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})

test.each([202, 429])('times out pending HTTP %s scans even when Retry-After exceeds the deadline', async status => {
  jest.useFakeTimers()
  global.fetch.mockReset().mockResolvedValue(new Response(null, { status, headers: { 'Retry-After': '60' } }))
  const controller = new AbortController()
  const pending = command.pollScan(scansUrl, { signal: controller.signal })
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  await jest.advanceTimersByTimeAsync(0)
  controller.abort()
  await rejected
  expect(global.fetch).toHaveBeenCalledTimes(1)
})

test('aborts a stalled submission with the specified timeout message', async () => {
  command.argv.push('--timeout', '1')
  let signal
  const submitting = new Promise(resolve => {
    global.fetch.mockReset().mockImplementation((url, options) => {
      signal = options.signal
      resolve()
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Request aborted')), { once: true })
      })
    })
  })
  const pending = command.run()
  const rejected = expect(pending).rejects.toThrow(timeoutMessage)
  await submitting
  await rejected
  expect(signal.aborted).toBe(true)
  expect(await fs.pathExists(path.dirname(zipPath))).toBe(false)
})
