$ = require 'jQuery'
fs = require 'fs'

redis = require 'redis'
rclient = redis.createClient()

moment = require 'moment'

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

data = fs.readFileSync('mit-course-6-fb.html', 'utf-8')

people = {}
for x in $(data).find('.fsl.fwb.fcb')
  fburl = $(x).find('a').attr('href')
  name = $(x).find('a').text()
  people[fburl] = name

buildingdata = fs.readFileSync('buildings.txt', 'utf-8')
location_list = []
location_addresses = {}
for line in buildingdata.split('\n')
  [buildingname,buildingaddress] = line.split('\t')
  location_list.push buildingname
  location_addresses[buildingname] = buildingaddress

#location_list = ['Ashdown House', 'Baker House']

randInt = (minval, maxval) -> # returns between 0 and maxval-1
  if not maxval?
    maxval = minval
    minval = 0
  offset = maxval - minval
  return minval + Math.floor(Math.random() * offset)

randElem = (array) ->
  return array[randInt(array.length)]

randSample = (array, numelems) ->
  output = []
  output_set = {}
  if numelems >= array.length
    return array
  while output.length < numelems
    elem = randElem(array)
    if not output_set[elem]?
      output.push elem
      output_set[elem] = true
  return output

class_participants = {}
for classname in classlist
  class_participants[classname] = []

email_to_classlist = {}

for email,name of people
  numClasses = randInt(1, 4)
  classes = randSample(classlist, numClasses)
  email_to_classlist[email] = classes
  for classname in classes
    class_participants[classname].push email

surroundingDates = () ->
  dates = []
  for i in [7...0]
    dates.push moment(Date()).subtract('days', i)
  for i in [0..10]
    dates.push moment(Date()).add('days', i)
  return dates

mkId = () -> Math.floor(Math.random()*9007199254740992)

getAddress = (location) ->
  addr = location_addresses[location]
  if addr?
    return addr + ' , MIT, Cambridge, MA'
  return location + ' , MIT, Cambridge, MA'

mkUser = (email) ->
  return {'email': email, 'fullname': people[email]}

mkParticipantList = (participants) ->
  return (mkUser(participant) for participant in participants)

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

allevents = {}

for classname in classlist
  console.log classname
  if classname == 'ESD.344'
    continue
  allevents[classname] = {}
  partyCounter = 0
  for date in surroundingDates()
    numPartiesToday = randInt(0, 2)
    for i in [0..numPartiesToday]
      partyCounter += 1
      partyStartTime = moment(date).add('hours', randInt(48)/2.0)
      partyEndTime = moment(partyStartTime).add('hours', randInt(2,5)/2.0)
      partyLocation = randElem(location_list)
      numParticipants = randInt(1,4)
      partyParticipants = randSample(class_participants[classname], numParticipants)
      event = {
        'id': mkId(),
        'start': partyStartTime.format(),
        'end': partyEndTime.format(),
        'location': partyLocation,
        'address': getAddress(partyLocation),
        'partyname': 'party ' + partyCounter,
        'subjectname': classname,
        'participants': fixEventParticipantFormat(mkParticipantList(partyParticipants)),
      }
      if not event.location or not event.address or not event.id or not event.start or not event.end or not event.partyname or not event.subjectname or event.participants.length == 0 or event.participants.length != numParticipants
        continue
      allevents[classname][event.id] = event
      #console.log event

ndata = JSON.stringify({cl: email_to_classlist, ev: allevents})

#fs.writeFileSync('psetparty-generated.json', ndata, 'utf-8')
rclient.set('psetparty', ndata, () ->
  rclient.set('psetparty-backup', ndata, () ->
    process.exit()
  )
)

