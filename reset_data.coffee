redis = require 'redis'
rclient = redis.createClient()

ndata = JSON.stringify({cl: {}, ev: {}})

#fs.writeFileSync('psetparty-generated.json', ndata, 'utf-8')
rclient.set('psetparty', ndata, () ->
  rclient.set('psetparty-backup', ndata, () ->
    process.exit()
  )
)

