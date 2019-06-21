var uuid = require('uuid/v4')
var vault = require('offen/vault')
var format = require('date-fns/format')
var addDays = require('date-fns/add_days')
var differenceInDays = require('date-fns/difference_in_days')
var get = require('lodash/get')

module.exports = store

function takeEvents (numDays, events) {
  var now = Date.now()
  return events
    .filter(function (event) {
      var distance = differenceInDays(now, event.payload.timestamp)
      return distance < numDays
    })
}

function groupEvents (numDays, events) {
  var now = new Date()
  var dates = {}
  for (var i = 0; i < numDays; i++) {
    var date = addDays(now, -i)
    var formatted = format(date, 'DD.MM.YYYY')
    dates[formatted] = []
  }
  events.forEach(function (event) {
    var formatted = format(event.payload.timestamp, 'DD.MM.YYYY')
    if (dates[formatted]) {
      dates[formatted].push(event.payload)
    }
  })
  return dates
}

function getReferrers (events) {
  return events
    .filter(function (event) {
      return event.payload && event.payload.referrer
    })
    .map(function (event) {
      var url = new window.URL(event.payload.referrer)
      return url.host || url.href
    })
    .filter(function (host) {
      return host
    })
    .reduce(function (acc, host) {
      acc[host] = acc[host] || 0
      acc[host]++
      return acc
    }, {})
}

function getUnique (/* , ...path */) {
  var path = [].slice.call(arguments, 0)
  path = path.join('.')
  return function (events) {
    var elements = events
      .reduce(function (acc, event) {
        var value = get(event, path)
        if (value) {
          acc[value] = true
        }
        return acc
      }, {})
    return Object.keys(elements).length
  }
}

function store (state, emitter) {
  emitter.on('offen:query', function (data) {
    vault(process.env.VAULT_HOST)
      .then(function (postMessage) {
        var queryRequest = {
          type: 'QUERY',
          respondWith: uuid(),
          payload: data
            ? { query: data }
            : null
        }
        return postMessage(queryRequest)
      })
      .then(function (message) {
        var result = message.payload.result
        var numDays = parseInt(state.query.num_days, 10) || 7
        var scopedEvents = takeEvents(numDays, result.events)
        state.model = {
          eventsByDate: groupEvents(numDays, result.events),
          uniqueSessions: getUnique('payload', 'sessionId')(scopedEvents),
          uniqueUsers: getUnique('user_id')(scopedEvents),
          referrers: getReferrers(scopedEvents),
          account: result.account
        }
      })
      .catch(function (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(err)
          if (err.originalStack) {
            console.log('Error has been thrown in vault with original stacktrace:')
            console.log(err.originalStack)
          }
        }
        state.model.error = { message: err.message, stack: err.originalStack || err.stack }
      })
      .then(function () {
        state.model.loading = false
        emitter.emit(state.events.RENDER)
      })
  })
}

store.storeName = 'data'