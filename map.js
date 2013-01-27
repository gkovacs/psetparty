function stringToColor(str){
  return '#' + md5(str).substring(0,6)
}

function refreshEventsMap() {
  getEvents(function(events) {
    for (var i = 0; i < events.length; ++i) {
      var event = events[i]
      if (!isShownOnMap(event)) continue
      if (event.id == currentlyOpenInfoWindowEventId && currentlyOpenInfoWindow && currentlyOpenInfoWindow.open && currentlyOpenInfoWindow.close && currentlyOpenInfoWindow.getAnchor && currentlyOpenInfoWindow.getAnchor()) {
        var newcontent = getEventHtmlBox(event)
        if (newcontent == currentlyOpenInfoWindow.content) continue
        currentlyOpenInfoWindow.close()
        currentlyOpenInfoWindow.content = getEventHtmlBox(event)
        currentlyOpenInfoWindow.open(map, currentlyOpenMarker)
      }
      if (!isdefined(markersById[event.id])) {
        addMarkerForEvent(event)
      }
      console.log(event.id)
    }
  })
}

function refreshMap() {
  clearMarkers()
  placeEvents()
}

function mapEntered() {
  console.log('map entered')
  initializeMap()
  refreshMap()
}

function isShownOnMap(event) {
  var firstAcceptableTime = moment(new Date())
  var lastAcceptableTime = moment(new Date()).add('weeks', 1)
  var eventStartTime = moment(event.start)
  if (eventStartTime < firstAcceptableTime) return false
  if (eventStartTime > lastAcceptableTime) return false
  return true
}

function placeEvents() {
  getEvents(function(events) {
    for (var i = 0; i < events.length; ++i) {
      var event = events[i]
      if (!isShownOnMap(event)) continue
      addMarkerForEvent(event)
    }
  })
}

markersById = {}
infoWindowsById = {}

function clearMarkers() {
  for (var id in markersById) {
    markersById[id].setMap(null)
  }
}

function emailNamePair(x) {
  return $('<a>')
    .attr('href', 'mailto:' + x.email)
    .attr('title', x.email)
    .attr('alt', x.email)
    .text(x.fullname)
}

function printParticipants(participants) {
  if (participants == null) {
    return $('<span>')
  } else {
    var output = $('<span>')
    for (var i = 0; i < participants.length; ++i) {
      var currentParticipant = emailNamePair(participants[i])
      output.append(currentParticipant).append(' ')
    }
    return output
  }
}

function togglejoin(eventid) {
  console.log('clicked!')
  console.log(eventid)
  var subjectname = $('#jlb' + eventid).attr('subjectname')
  var toggledbutton = $('#jlb' + eventid)
  var event = {'id': eventid, 'subjectname': subjectname}
  if (toggledbutton.text() == 'Join') {
    now.joinEvent(event, getUser())
  } else {
    now.leaveEvent(event, getUser())
    if (activeClasses().indexOf(subjectname) == -1) {
      refresh()
      refreshMap()
    }
  }
}

function getEventHtmlBox(event) {
  var ndiv = $('<div>')
  ndiv.append($('<b>').text('Class: ')).append($('<span>').text(event.subjectname.toString())
  ).append(
    $('<div>').append($('<b>').text('Name: ')).append($('<span>').text(event.partyname.toString()))
  ).append(
    $('<div>').append($('<b>').text('Location: ')).append($('<span>').text(event.location.toString()))
  ).append(
    $('<div>').append($('<b>').text('Time: ')).append(moment(event.start).fromNow())
  ).append(
    $('<span>').append($('<b>').text('Attendees: ')).append(printParticipants(event.participants))
  )
  var buttonText = 'Join'
  if (isAttending(event)) {
    buttonText = 'Leave'
  }
  var nbutton = '<button id="jlb' + event.id + '" subjectname="' + event.subjectname.toString() + '" onclick="togglejoin(' + event.id + ')">' + buttonText + '</button>'
  ndiv.append(nbutton)
  return $('<div>').append(ndiv).html()
}

function isClassroom(str) {
  var splitByDash = str.split('-')
  if (splitByDash.length == 2 && !isNaN(parseInt(splitByDash[0])) && !isNaN(parseInt(splitByDash[1])))
    return true
  return false
}

function getClassroomAddress(str) {
  var splitByDash = str.split('-')
  return 'Building ' + splitByDash[0] + ' , MIT, Cambridge, MA'
}

function getLatLngForEvent(event, callback) {
  var places = [event.location + ' , MIT, Cambridge, MA', event.location]
  if (isClassroom(event.location)) {
    places[0] = getClassroomAddress(event.location)
  }
  getLatLng(places[0], function(result1) {
    if (result1 != null) {
       callback(result1)
    } else {
      getLatLng(places[1], function(result2) {
        if (result2 != null) {
          callback(result2)
        }
      })
    }
  })
}

currentlyOpenInfoWindowEventId = -1
currentlyOpenInfoWindow = {}
currentlyOpenMarker = {}

function getLatestEvent(event) {
  var events = listEvents()
  for (var i = 0; i < events.length; ++i) {
    if (events[i].id == event.id) return events[i]
  }
  return event
}

function addMarkerForEvent(event) {
        getLatLngForEvent(event, function(latlng) {
          var marker = new google.maps.Marker({
            'position': latlng,
          })
          markersById[event.id] = marker
          google.maps.event.addListener(marker, 'click', function() {
            if (isdefined(currentlyOpenInfoWindow) && isdefined(currentlyOpenInfoWindow.close)) {
              currentlyOpenInfoWindow.close()
            }
            currentlyOpenInfoWindowEventId = event.id
            currentlyOpenMarker = this
            currentlyOpenInfoWindow = new google.maps.InfoWindow({
              'content': getEventHtmlBox(getLatestEvent(event)),
            })
            currentlyOpenInfoWindow.open(map, this)
          })
          marker.setMap(map)
        })
      }

function getLatLng(str, callback) {
        if (!isdefined(geocoder)) return
        geocoder.geocode({
          'address': str,
          'region': 'US',
          'bounds': getMITLatLngBounds(),
        }, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            console.log(results[0].geometry.location)
            if (callback != null) callback(results[0].geometry.location)
          }
        })
      }

      function getMITLatLngBounds() {
        return new google.maps.LatLngBounds(new google.maps.LatLng(42.3543643, -71.10349120000001), new google.maps.LatLng(42.3630281, 71.08594310000001))
      }

mapInitialized = false
geocoder = null

function initializeMap() {
if (mapInitialized) return
mapInitialized = true
        $('#map_canvas').html('')
        geocoder = new google.maps.Geocoder();
        var mapOptions = {
          center: new google.maps.LatLng(42.3590995, -71.0934608),
          zoom: 16,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map = new google.maps.Map(document.getElementById("map_canvas"),
            mapOptions);
        //$('#map_canvas').height(500)
      }
