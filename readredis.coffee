redis = require 'redis'
rclient = redis.createClient()

await
  rclient.get('psetparty', defer(err,response))

#console.log err
console.log response
process.exit(0)
