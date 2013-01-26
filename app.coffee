fs = require 'fs'
request = require 'request'
$ = require 'jQuery'
restler = require 'restler'

express = require 'express'
app = express()
http = require 'http'
httpserver = http.createServer(app)
httpserver.listen(3333)
nowjs = require 'now'
everyone = nowjs.initialize(httpserver)

app.configure('development', () ->
  app.use(express.errorHandler())
)

app.configure( ->
  app.set('views', __dirname + '/views')
  app.set('view engine', 'ejs')
  app.use(express.bodyParser())
  app.use(express.methodOverride())
  app.set('view options', { layout: false })
  app.locals({ layout: false })
  app.use(express.static(__dirname + '/'))
)

classes = {}

classlist = []
classlist_set = {}

classdata = fs.readFileSync('classes.txt', 'utf-8')
for line in classdata.split('\n')
  if line.indexOf('\t') == -1
    continue
  subjectnum = line.split('\t')[0]
  if not classlist_set[subjectnum]?
    classlist_set[subjectnum] = true
    classlist.push subjectnum
classlist.sort()

everyone.now.addClassType = (classname) ->
  if typeof classname != typeof ''
    return
  if not classlist_set[classname]?
    classlist_set[classname] = true
    classlist.push classname
    classlist.sort()

everyone.now.getClassesWithPrefix = (prefix, callback) ->
  matches = (x for x in classlist when x.indexOf(prefix) == 0)
  callback matches

everyone.now.getCalendarId = getCalendarId = (classname, callback) ->
  restler.get('http://localhost:5000/calid?title=' + classname).on('complete', callback)

root.classids = {}

everyone.now.getCalendarIds = (classnames, callback) ->
  await
    for title,i in classnames
      if not root.classids[title]?
        getCalendarId(title, defer(classids[title]))
  callback(root.classids)

everyone.now.getClasses = (username, callback) ->
  if not classes[username]?
    classes[username] = []
  if callback?
    callback(classes[username])

everyone.now.addClass = (username, classname, callback) ->
  if not classes[username]?
    classes[username] = []
  if classes[username].indexOf(classname) == -1
    classes[username].push classname
  if callback?
    callback(classes[username])

everyone.now.removeClass = (username, classname, callback) ->
  if not classes[username]?
    classes[username] = []
  classes[username] = (x for x in classes[username] when x != classname)
  if callback?
    callback(classes[username])

