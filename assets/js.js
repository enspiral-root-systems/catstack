const { assign } = Object
const { isArray } = Array
const { join } = require('path')
const nest = require('depnest')
const Js = require('browserify')
const Cache = require('browserify-persist-fs')
const CacheStats = require('browserify-persist-fs/stats')

module.exports = {
  needs: nest('config', {
    all: 'first',
    'assets.js': 'reduce'
  }),
  gives: nest([
    'config.assets.js',
    'assets.js'
  ]),
  create: (api) => {
    var cache
    const cacheStats = CacheStats()

    return nest({
      'config.assets.js': config,
      'assets.js': js
    })

    function config (sofar = {}) {
      var next = assign({}, sofar, {
        entries: [
          join(__dirname, '../browserEntry.js')
        ].concat(sofar.entries || []),
        debug: api.config.all().nodeEnv !== 'production',
        transform: [
          [ 'evalify', { files: ['**/service.js', '**/services/*.js'] } ],
          [ 'bulkify', { vars: { cwd: api.config.all().cwd, process } } ],
          'es2040'
        ].concat(sofar.transform || [])
      })
      cache = Cache(
        join(__dirname, '../.cache'),
        {
          debug: next.debug,
          transform: next.transform.map(t => {
            // TODO what if transform is a module export?
            const name = isArray(t) ? t[0] : t
            return require(name + '/package.json').version
          })
        },
        cacheStats.update
      )
      next.persistentCache = cache
      return next
    }

    function js () {
      return Js(api.config.assets.js()).bundle(() => {
        // DEBUG
        cache.gc({
          maxAge: 100000, // Age of a file in milliseconds (Default: Number.MAX_SAFE_INTEGER)
          parallel: 10
        }, function (err, deletedFiles) {
          console.log(cacheStats.render(err, deletedFiles))
        })
      })
    }
  }
}
