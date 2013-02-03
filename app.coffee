fs = require 'fs'
request = require 'request'
$ = require 'jQuery'
restler = require 'restler'

moment = require 'moment'

redis = require 'redis'
rclient = redis.createClient()

console.log 'loading redis data'
#{cl: classes, ev: allevents} = JSON.parse fs.readFileSync('psetparty.json', 'utf-8')
await
  rclient.get('psetparty', defer(rediserr, redisdata))
  rclient.get('geocodecache', defer(rediserr2, geocodecachedata))
{'cl': classes, 'ev': allevents} = JSON.parse redisdata
geocodecache = JSON.parse geocodecachedata
if not geocodecache?
  geocodecache = {}

console.log 'finished loading redis data'

restore_backup_passphrase = fs.readFileSync('restore_backup_passphrase.txt', 'utf-8').trim()

googlemaps = require 'googlemaps'

express = require 'express'
app = express()
http = require 'http'
httpserver = http.createServer(app)
httpserver.listen(3333)
nowjs = require 'now'
everyone = nowjs.initialize(httpserver)

passport = require('passport')
FacebookStrategy = require('passport-facebook').Strategy

indexContents = fs.readFileSync('index.html')

FACEBOOK_APP_ID = '123681104472943'
FACEBOOK_APP_SECRET = '9115798d61b57d41b5e10b66f49e86a0'
hostname = require('os').hostname()
if hostname == 'psetparty'
  FACEBOOK_APP_ID = '122852207888099'
  FACEBOOK_APP_SECRET = 'aeb972a64f7d04e23a8fd509a61e8f90'

# Passport session setup.
#   To support persistent login sessions, Passport needs to be able to
#   serialize users into and deserialize users out of the session.  Typically,
#   this will be as simple as storing the user ID when serializing, and finding
#   the user by ID when deserializing.  However, since this example does not
#   have a database of user records, the complete Facebook profile is serialized
#   and deserialized.
passport.serializeUser((user, done) ->
  done(null, user)
)

passport.deserializeUser((obj, done) ->
  done(null, obj)
)

# Use the FacebookStrategy within Passport.
#   Strategies in Passport require a `verify` function, which accept
#   credentials (in this case, an accessToken, refreshToken, and Facebook
#   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
  }, (accessToken, refreshToken, profile, done) ->
    # asynchronous verification, for effect...
    process.nextTick( () ->
      # To keep the example simple, the user's Facebook profile is returned to
      # represent the logged-in user.  In a typical application, you would want
      # to associate the Facebook account with a user record in your database,
      # and return that user instead.
      return done(null, profile);
    )
))

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
  # fb authentication stuff
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  # Initialize Passport!  Also use passport.session() middleware, to support
  # persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  # end of fb authentication stuff
  app.use(express.static(__dirname + '/'))
)

#app.get '/', (req, res) ->
#  if req.query? and req.query.email? and req.query.name?
#    res.redirect('/setcookie.html?email=' + encodeURI(req.query.email) + '&name=' + encodeURI(req.query.name))
#  else
#    res.redirect('/login.html')

# GET /auth/facebook
#   Use passport.authenticate() as route middleware to authenticate the
#   request.  The first step in Facebook authentication will involve
#   redirecting the user to facebook.com.  After authorization, Facebook will
#   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook', passport.authenticate('facebook'), (req, res) ->
  # The request will be redirected to Facebook for authentication, so this
  # function will not be called.
)

# GET /auth/facebook/callback
#   Use passport.authenticate() as route middleware to authenticate the
#   request.  If authentication fails, the user will be redirected back to the
#   login page.  Otherwise, the primary route function function will be called,
#   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login.html' }), (req, res) ->
  res.redirect('/setcookie.html?email=' + encodeURI(req.user.profileUrl) + '&name=' + encodeURI(req.user.displayName))
)

ensureAuthenticated = (req, res, next) ->
  if req.isAuthenticated()
    return next()
  res.redirect('/login.html')

fixParticipantFormat = (x) ->
  if x.email?
    return x
  else
    return {'email': x[0], 'fullname': x[1]}

fixEventParticipantFormat = (event) ->
  if not event.participants?
    event.participants = []
  participants = (fixParticipantFormat(participant) for participant in event.participants)
  event.participants = participants
  return event

eventListToDictionary = (eventlist) ->
  output = {}
  for event in eventlist
    output[event.id] = event
  return output

if not allevents?
  allevents = {}
do ->
  for k,v of allevents
    #console.log allevents[k]
    if allevents[k] instanceof Array
      allevents[k] = eventListToDictionary(allevents[k])
    for eventid,event of allevents[k]
      eventid = parseInt(eventid)
      allevents[k][eventid] = fixEventParticipantFormat(event)
#everyone.now.events = allevents

participantToEvent = {}

do ->
  for subjectname,v of allevents
    for eventid,event of allevents[subjectname]
      for participant in event.participants
        email = participant.email
        if not participantToEvent[email]?
          participantToEvent[email] = {}
        participantToEvent[email][event.id] = subjectname

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

buildingdata = fs.readFileSync('buildings.txt', 'utf-8')
location_list = []
location_addresses = {}
for line in buildingdata.split('\n')
  [buildingname,buildingaddress] = line.split('\t')
  location_list.push buildingname
  location_addresses[buildingname] = buildingaddress

everyone.now.location_list = location_list
everyone.now.location_addresses = location_addresses

getAddress = everyone.now.getAddress = (location) ->
  addr = location_addresses[location]
  if addr?
    if addr.indexOf('Boston') != -1 or addr.indexOf('Brookline') != -1 or addr.indexOf('Cambridge') != -1
      return addr
    else
      return addr + ' , MIT, Cambridge, MA'
  return location + ' , MIT, Cambridge, MA'

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

###
# s: "2013-01-21T07:30:00-05:00"
splitTimeRange = (s) ->
  [date,timerange] = s.split('T')
  [start,end] = timerange.split('-')
  startTime = new Date(date + 'T' + start)
  endTime = new Date(date + 'T' + end)
  return [startTime, endTime]
###

parseEvent = (event) ->
  #[startTime, endTime] = splitTimeRange(event.start.dateTime)
  return {
    'id': event.id,
    'title': event.summary,
    'start': new Date(event.start.dateTime),
    'end': new Date(event.end.dateTime),
  }

getEventsUserIsParticipating = everyone.now.getEventsUserIsParticipating = (username, callback) ->
  events = []
  customEventDict = participantToEvent[username] ? {}
  #console.log participantToEvent
  for eventid,subjectname of customEventDict
    eventid = parseInt(eventid)
    subjectevents = allevents[subjectname] ? {}
    if subjectevents[event.id]?
      events.push subjectevents[event.id]
  callback events

getEventsForUser = everyone.now.getEventsForUser = (username, callback) ->
  await
    getClasses(username, defer(classlist))
  events_per_class = []
  await
    for title,i in classlist
      getEvents(title, defer(events_per_class[i]))
  events = []
  eventid_set = {}
  for events_for_class in events_per_class
    for event in events_for_class
      events.push event
      eventid_set[event.id] = true
  # now we add subjects for which the user is participating but isn't in the class
  '''
  customEventDict = participantToEvent[username] ? {}
  for eventid,subjectname of customEventDict
    eventid = parseInt(eventid)
    if eventid_set[eventid]?
      continue
    subjectevents = allevents[subjectname] ? {}
    if subjectevents[eventid]?
      events.push subjectevents[eventid]
  '''
  callback events

getEventsUserIsParticipating = everyone.now.getEventsUserIsParticipating = (username, callback) ->
  events = []
  # now we add subjects for which the user is participating but isn't in the class
  customEventDict = participantToEvent[username] ? {}
  for eventid,subjectname of customEventDict
    eventid = parseInt(eventid)
    subjectevents = allevents[subjectname] ? {}
    if subjectevents[eventid]?
      events.push subjectevents[eventid]
  callback events

abbreviatedUserName = (email) ->
  if email.indexOf('@MIT.EDU') != -1
    return email.split('@MIT.EDU').join('')
  if email.indexOf('http://www.facebook.com/') != -1
    return email.split('http://www.facebook.com/').join('')
  return email

getIcalForUser = (username, callback) ->
  getEventsUserIsParticipating(username, (events) ->
    output = []
    calendar_description = 'Pset Parties attended by ' + abbreviatedUserName(username)
    output.push('''BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:''' + calendar_description + '''

X-WR-TIMEZONE:America/New_York
X-WR-CALDESC:''' + calendar_description + '''

BEGIN:VTIMEZONE
TZID:America/New_York
X-LIC-LOCATION:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE'''.split('\n').join('\r\n'))
    output.push 'DESCRIPTION:' + calendar_description
    for event in events
      output.push eventToIcal(event)
    output.push 'END:VCALENDAR'
    callback(output.join('\r\n'))
  )

app.get '/exportcal', (req, res) ->
  username = req.query.username
  if not username?
    res.send 'need username'
    return
  if username.lastIndexOf('_') != -1 and username.lastIndexOf('.ical') + 5 == username.length
    username = username[0...username.lastIndexOf('_')]
  getIcalForUser(username, (icaldata) ->
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.send icaldata
  )

eventToIcal = (event) ->
  output = []
  output.push 'BEGIN:VEVENT'
  output.push 'DTSTART;TZID=America/New_York:' + moment(event.start).format('YYYYMMDDTHHmmss') + 'Z'
  output.push 'DTEND;TZID=America/New_York:' + moment(event.end).format('YYYYMMDDTHHmmss') + 'Z'
  eventSummary = []
  if event.subjectname? and event.subjectname != ''
    eventSummary.push event.subjectname
  if event.partyname? and event.partyname != ''
    eventSummary.push event.partyname
  if event.location? and event.location != ''
    eventSummary.push event.location
  output.push 'SUMMARY:' + eventSummary.join(' - ')
  output.push 'DESCRIPTION:' + eventSummary.join(' - ')
  for participant in event.participants
    useremail = participant.email
    if not useremail?
      useremail = 'somebody'
    if useremail.indexOf('http://') != -1
      useremail = abbreviatedUserName(useremail) + '@facebook.com'
    output.push 'ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=' + participant.fullname + ';X-NUM-GUESTS=0:' + useremail
  output.push 'LOCATION:' + event.location
  output.push 'END:VEVENT'
  return output.join('\r\n')

mkId = () -> Math.floor(Math.random()*9007199254740992)

deleteEvent = everyone.now.deleteEvent = (subjectname, eventid, callback) ->
  if not allevents[subjectname]?
    allevents[subjectname] = {}
  if allevents[subjectname][eventid]?
    delete allevents[subjectname][eventid]
  if callback?
    callback()
  everyone.now.refreshUser()

addEvent = everyone.now.addEvent = (subjectname, event, callback) ->
  if not allevents[subjectname]?
    allevents[subjectname] = {}
  newid = mkId()
  while allevents[subjectname][newid]?
    newid = mkId()
  event.id = newid
  event.address = getAddress(event.location)
  event.subjectname = subjectname
  allevents[subjectname][event.id] = event
  if callback?
    callback newid
  everyone.now.refreshUser()

toValues = (dict) ->
  output = []
  for key,value of dict
    output.push value
  return output

getEvents = everyone.now.getEvents = (title, callback) ->
  ###
  restler.get('http://localhost:5000/events?title=' + title).on('complete', (events) ->
    items = events.items ? []
    callback (parseEvent(event) for event in items)
  )
  ###
  if not allevents[title]?
    allevents[title] = []
  callback toValues(allevents[title])

app.get '/events', (req, res) ->
  title = req.query.title
  if title?
    getEvents(title, (x) -> res.json(x))
    return
  username = req.query.username
  if username?
    getEventsForUser(username, (x) -> res.json(x))
    return
  res.send 'no title or username specified'

app.get '/classes', (req, res) ->
  username = req.query.username
  if username?
    getClasses(username, (x) -> res.json(x))

everyone.now.getAuthenticated = (key, callback) ->
  if authentications[key]?
    callback(authentications[key])

authentications = {}

app.get '/authenticate', (req, res) ->
  email = req.query.email
  if not email?
    res.send 'e'
    return
  name = req.query.name
  if not name?
    res.send 'n'
    return
  key = req.query.key
  if not key?
    res.send 'k'
    return
  #secret = req.query.secret
  #if not secret?
  #  res.send 's'
  #  return
  authentications[key] = {'email': email, 'fullname': name}
  console.log key #secret
  console.log email
  console.log name
  res.send 'g'

dumpToDisk = (callback) ->
  console.log 'dumping to disk'
  rclient.set('geocodecache', JSON.stringify(geocodecache))
  ndata = JSON.stringify({'cl': classes, 'ev': allevents})
  #fs.writeFileSync('psetparty.json', ndata, 'utf-8')
  rclient.set('psetparty', ndata, callback)
  return ndata

app.get '/app.js', (req, res) ->
  res.redirect '/'

app.get '/app.coffee', (req, res) ->
  res.redirect '/'

app.get '/restore_backup_passphrase.txt', (req, res) ->
  res.redirect '/'

app.get '/save', (req, res) ->
  dumpToDisk(() -> res.send 'saved')

app.get '/restorebackup', (req, res) ->
  if not req.query? or not req.query.key? or req.query.key != restore_backup_passphrase
    res.redirect '/'
    return
  console.log 'getting backup'
  rclient.get('psetparty-backup', (rediserr2, redisdata2) ->
    console.log 'setting psetparty to backup'
    rclient.set('psetparty', redisdata2, () ->
      console.log 'restarting process'
      res.send 'backup restored'
      process.exit()
    )
  )
  #dumpToDisk(() -> res.send 'saved')

#app.get '/restart', (req, res) ->
#  process.exit()

everyone.now.getCalendarIds = (classnames, callback) ->
  await
    for title,i in classnames
      if not root.classids[title]?
        getCalendarId(title, defer(classids[title]))
  callback(root.classids)

everyone.now.getClasses = getClasses = (username, callback) ->
  if not classes[username]?
    classes[username] = []
  if callback?
    callback(classes[username])

everyone.now.addClass = (username, classname, callback) ->
  if not classes[username]?
    classes[username] = []
  if classlist_set[classname]? and classes[username].indexOf(classname) == -1
    classes[username].push classname
  if callback?
    callback(classes[username])

everyone.now.removeClass = (username, classname, callback) ->
  if not classes[username]?
    classes[username] = []
  classes[username] = (x for x in classes[username] when x != classname)
  if callback?
    callback()

addUserIfNotPresent = (event, user) ->
  emails = (x.email for x in event.participants)
  if emails.indexOf(user.email) == -1
    event.participants.push user

removeUserIfPresent = (event, user) ->
  emails = (x.email for x in event.participants)
  if emails.indexOf(user.email) != -1
    newparticipants = (x for x in event.participants when x.email != user.email)
    event.participants = newparticipants

everyone.now.joinEvent = (event, user) ->
  eventid = event.id 
  title = event.subjectname
  if not allevents[title]?
    return
  if not participantToEvent[user.email]?
    participantToEvent[user.email] = {}
  participantToEvent[user.email][eventid] = title
  if allevents[title][eventid]?
    addUserIfNotPresent(allevents[title][eventid], user)
  everyone.now.refreshUser()

everyone.now.leaveEvent = (event, user) ->
  eventid = event.id
  title = event.subjectname
  if not allevents[title]?
    return
  if participantToEvent[user.email]? and participantToEvent[user.email][eventid]?
    delete participantToEvent[user.email][eventid]
  if allevents[title][eventid]?
    removeUserIfPresent(allevents[title][eventid], user)
  everyone.now.refreshUser()

everyone.now.geocode = (str, callback) ->
  if geocodecache[str]?
    callback geocodecache[str]
    return
  googlemaps.geocode(str, (geoerr, georesults) ->
    if not georesults? or not georesults.status? or georesults.status != 'OK'
      callback(null)
      return
    else
      resultLocation = georesults.results[0].geometry.location
      geocodecache[str] = resultLocation
      console.log 'cached: ' + str
      callback(resultLocation)
      return
  )

process.on 'SIGINT', () ->
  dumpToDisk(() ->
    console.log 'exiting'
    process.exit()
  )

process.on 'SIGTERM', () ->
  dumpToDisk(() ->
    console.log 'exiting'
    process.exit()
  )

process.on 'SIGQUIT', () ->
  dumpToDisk(() ->
    console.log 'exiting'
    process.exit()
  )

