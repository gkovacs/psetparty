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
        currentlyOpenInfoWindow.open(getGoogleMap(), currentlyOpenMarker)
      }
      if (!isdefined(markersById[event.id])) {
        addMarkerForEvent(event)
      }
      //console.log(event.id)
    }
  })
}

//googleMap = null

function refreshMap() {
  refreshEventsMap()
  placeEvents()
}

function calendarEntered() {
  $('#timeRangeDisplayDiv').hide()
}

function mapEntered() {
  $('#timeRangeDisplayDiv').show()
  //console.log('map entered')
  initializeMap()
  refreshMap()
  setTimeout(function() {
    //getGoogleMap().setCenter(new google.maps.LatLng(42.3590995, -71.0934608))
    google.maps.event.trigger(getGoogleMap(), 'resize')
    getGoogleMap().setCenter(new google.maps.LatLng(42.3590995, -71.0934608))
  }, 100)
  
}

function getLastAcceptableTime() {
 // return whatever time you want to display up to
 var numHoursAhead = parseInt($('#timeRange').val())
 return moment(new Date()).add('hours', numHoursAhead)
}

function timeRangeSliderChanged() {
  var timeRangeVal = parseInt($('#timeRange').val())
  var relativeTime =  timeRangeVal + ' hours'
  if (relativeTime == '1 hours') relativeTime = 'hour'
  if (timeRangeVal > 48)
    relativeTime = getLastAcceptableTime().fromNow().toString().split('in ').join('').split('an ').join('').split('a ').join('')
  $('#timeRangeDisplay').text('Show pset parties in the next ' + relativeTime)
  refreshMap()
}

function isShownOnMap(event) {
  var firstAcceptableTime = moment(new Date())
  var lastAcceptableTime = getLastAcceptableTime()
  var eventStartTime = moment(event.start)
  if (eventStartTime < firstAcceptableTime) return false
  if (eventStartTime > lastAcceptableTime) return false
  return true
}

function removeEventFromMap(eventid) {
  if (isdefined(markersById[eventid])) {
    markersById[eventid].setMap(null)
    //delete markersById[eventid]
  }
}

function placeEvents() {
  getEvents(function(events) {
    var activeEvents = {}
    for (var i = 0; i < events.length; ++i) {
      var event = events[i]
      if (!isShownOnMap(event)) {
        removeEventFromMap(event.id)
        continue
      }
      activeEvents[event.id] = true
      if (isdefined(markersById[event.id])) {
        if (markersById[event.id].getMap() != getGoogleMap())
          markersById[event.id].setMap(getGoogleMap())
        continue
        //markersById[event.id].setMap(null)
      }
      addMarkerForEvent(event)
    }
    var allEventIds = Object.keys(markersById)
    for (var i = 0; i < allEventIds.length; ++i) {
      var inactiveEventId = parseInt(allEventIds[i])
      if (isdefined(activeEvents[inactiveEventId])) continue
      removeEventFromMap(inactiveEventId)
    }
  })
}

markersById = {}
infoWindowsById = {}

function clearMarkers() {
  var markerIds = Object.keys(markersById)
  for (var i = 0; i < markerIds.length; ++i) {
    var id = parseInt(markerIds[i])
    removeEventFromMap(id)
  }
}

function emailNamePair(x) {
  var emailAsURL = x.email
  if (emailAsURL.indexOf('@') != -1 && emailAsURL.indexOf('/') == -1) emailAsURL = 'mailto:' + emailAsURL
  return $('<a>')
    .attr('href', emailAsURL)
    .attr('title', x.email)
    .attr('alt', x.email)
    .attr('target', '_blank')
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
  //console.log('clicked!')
  //console.log(eventid)
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
  var partyname = event.partyname
  if (!partyname) partyname = ''
  var ndiv = $('<div>')
  ndiv.append($('<b>').text('Class: ')).append($('<span>').text(event.subjectname.toString())
  ).append(
    $('<div>').append($('<b>').text('Name: ')).append($('<span>').text(partyname.toString()))
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
  var places = [event.location + ' , MIT, Cambridge, MA', event.location + ' ,' + event.address, event.address]
  //if (isClassroom(event.location)) {
  //  places[0] = getClassroomAddress(event.location)
  //}
  getLatLng(places[0], function(result1) {
    if (result1) {
       callback(result1)
    } else {
      getLatLng(places[1], function(result2) {
        if (result2) {
          callback(result2)
        }
        
        getLatLng(places[2], function(result3) {
		      if (result3) {
		        callback(result3)
		      }
		    })
        
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

function getMarkerIconForClass(str) {
  var colorString = md5(str).substring(0,6)
  return 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|' + colorString
}

function addMarkerForEvent(event) {
  if (!getGoogleMap()) return
        var marker = new google.maps.Marker({
          //  'position': latlng,
          'icon': getMarkerIconForClass(event.subjectname),
          })
        marker.setMap(getGoogleMap())
        markersById[event.id] = marker
        getLatLngForEvent(event, function(latlng) {
          marker.setPosition(latlng)
          
          
          google.maps.event.addListener(marker, 'click', function() {
            if (isdefined(currentlyOpenInfoWindow) && isdefined(currentlyOpenInfoWindow.close)) {
              currentlyOpenInfoWindow.close()
            }
            currentlyOpenInfoWindowEventId = event.id
            currentlyOpenMarker = this
            currentlyOpenInfoWindow = new google.maps.InfoWindow({
              'content': getEventHtmlBox(getLatestEvent(event)),
            })
            currentlyOpenInfoWindow.open(getGoogleMap(), this)
          })
          //marker.setMap(map)
        })
      }

function getLatLng(str, callback) {
        if (!isdefined(geocoder)) {
          if (callback) callback(null)
          return
        }
        geocoder.geocode({
          'address': str,
          'region': 'US',
          'bounds': getMITLatLngBounds(),
        }, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            //console.log(results[0].geometry.location)
            if (callback) callback(results[0].geometry.location)
          } else {
            if (callback) callback(null)
          }
        })
      }

      function getMITLatLngBounds() {
        return new google.maps.LatLngBounds(new google.maps.LatLng(42.3543643, -71.10349120000001), new google.maps.LatLng(42.3630281, 71.08594310000001))
      }

mapContainer = {}

function getGoogleMap() {
  return mapContainer.googmap
}

function setGeoLocationMarker() {
  if(navigator.geolocation) {
    browserSupportFlag = true;
    navigator.geolocation.getCurrentPosition(function(position) {
      initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
      var marker = new google.maps.Marker({
        'position': initialLocation,
        'icon': 'youarehere.png',
        'title': 'This is your location',
      })
      marker.setMap(getGoogleMap())
      //map.setCenter(initialLocation);
    }, function() {
      //handleNoGeolocation(browserSupportFlag);
      console.log('geolocation not supported')
    });
  }
  
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
        mapContainer.googmap = googleMap = new google.maps.Map(document.getElementById("map_canvas"),
            mapOptions);
        //$('#map_canvas').height(500)
        setGeoLocationMarker()
      }
