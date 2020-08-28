const EventPoller = require('../../../src/lib/poller')
jest.useFakeTimers()

describe ('poller', () => {
  test('poll', () => {
    const poller = new EventPoller(1234)
    poller.emit = jest.fn()

    poller.poll('some fake args')
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1234)
    jest.runAllTimers()
    expect(poller.emit).toHaveBeenCalledWith('poll', 'some fake args')
  })

  test('onPoll', () => {
    const poller = new EventPoller(1234)
    poller.on = jest.fn()

    const a = () => {}
    poller.onPoll(a)
    expect(poller.on).toHaveBeenCalledWith('poll', a)
  })
})
