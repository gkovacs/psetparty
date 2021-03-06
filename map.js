function stringToColor(str){
  return '#' + md5(str).substring(0,6)
}

function refreshEventsMap(callback) {
  //console.log('refreshEventsMap')
  getEvents(function(events) {
    for (var eventCounter = 0; eventCounter < events.length; ++eventCounter) {
      var event = events[eventCounter]
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
      } else {
        if (markersById[event.id].getMap() != getGoogleMap()) {
          markersById[event.id].setMap(getGoogleMap())
        }
        if (!isdefined(markersById[event.id].getPosition())) {
          setMarkerPositionForEvent(event)
        }
      }
      //console.log(event.id)
    }
    if (callback) callback()
  })
}

//googleMap = null

function refreshMap() {
  refreshEventsMap()//function() {
    //placeEvents()
  //})
  placeEvents()
}

var isShowingCalendar = true

function showAddToCalendarButton() {
$('#addToGoogleCalendar').show()
$('#addToGoogleCalendarLink').attr('href', encodeURI('http://www.google.com/calendar/render?cid=http://psetparty.xvm.mit.edu:3333/exportcal?username=' + email + '_' + Math.floor(Math.random()*100000) + '.ical'))
}

function calendarEntered() {
  isShowingCalendar = true
  $('#scrollwrap').hide()
  $('#calendar').weekCalendar('resize')
  if (haveJoinedEvents()) { showAddToCalendarButton() }
  else { $('#addToGoogleCalendar').hide() }
}

var mapSettingCenterThisRun = true

function mapEntered() {
  isShowingCalendar = false
  $('#addToGoogleCalendar').hide()
  $('#scrollwrap').show()
  //console.log('map entered')
  initializeMap()
  refreshMap()
  setTimeout(function() {
    google.maps.event.trigger(getGoogleMap(), 'resize')
    if (mapSettingCenterThisRun) {
      getGoogleMap().setCenter(new google.maps.LatLng(42.3590995, -71.0934608))
      //mapSettingCenterThisRun = true
    } else {
      mapSettingCenterThisRun = true
    }
    //getGoogleMap().setCenter(new google.maps.LatLng(42.3590995, -71.0934608))
    $('#map_canvas').height($(window).height() - $('#map_canvas').offset().top - 50)
  }, 100)
  
}

function getLastAcceptableTime() {
 // return whatever time you want to display up to
 var numHoursAhead = parseInt($('#scroll').val())
 return moment(new Date()).add('hours', numHoursAhead)
}

function timeRangeSliderChanged() {
  var timeRangeVal = parseInt($('#scroll').val())
  var relativeTime =  timeRangeVal + ' hours'
  if (relativeTime == '1 hours') relativeTime = 'hour'
  if (timeRangeVal > 48)
    relativeTime = getLastAcceptableTime().fromNow().toString().split('in ').join('').split('an ').join('').split('a ').join('')
  $('#scrolldisplay').text('Pset parties in the next ' + relativeTime)
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

//setInterval(function() {
//  placeEvents()
//}, 500)

function eventsAtLocation(placename) {
  var output = []
  var events = listEvents()
  for (var i = 0; i < events.length; ++i) {
    if (placename == events[i].location)
      output.push(events[i])
  }
  return output
}

function showEventOnMap(event) {
  if (!isdefined(markersById[event.id])) {
        addMarkerForEvent(event)
      }
  if (markersById[event.id].getMap() != getGoogleMap())
    markersById[event.id].setMap(getGoogleMap())
  setMarkerPositionForEvent(event)
}

function placeEvents() {
  getEvents(function(events) {
    var activeEvents = {}
    for (var eventCounter = 0; eventCounter < events.length; ++eventCounter) {
      var event = events[eventCounter]

      if (!isShownOnMap(event)) {
        continue
      }
      
      showEventOnMap(event)
      
      activeEvents[event.id] = true
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

function toEmailList(participantList) {
  var output = []
  for (var i = 0; i < participantList.length; ++i) {
    var currentEmail = participantList[i].email
    if (currentEmail.indexOf('http://www.facebook.com/') == 0)
      currentEmail = currentEmail.split('http://www.facebook.com/').join('') + '@facebook.com'
    output.push(currentEmail)
  }
  return output
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
    if (participants.length > 1) {
      var mailToAll = $('<a>')
        .attr('href', 'mailto:' + toEmailList(participants).join(','))
        .text('Email All')
      output.append(mailToAll)
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
  )
  if (partyname != '') ndiv.append(
    $('<div>').append($('<b>').text('Name: ')).append($('<span>').text(partyname.toString()))
  )
  ndiv.append(
    $('<div>').append($('<b>').text('Location: ')).append($('<span>').text(event.location.toString()))
  ).append(
    $('<div>').append($('<b>').text('Time: ')).append(moment(event.start).calendar())
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

function getBuildingNumber(str) {
  var splitByDash = str.split('-')
  return 'Building ' + splitByDash[0]
}

function getLatLngForEvent(event, callback) {
  var places = [event.location + ' , ' + event.address, event.address, event.location + ' , MIT, Cambridge, MA']
  if (event.address.indexOf('Boston') != -1) {
    places = [event.address, event.location + ' , ' + event.address, event.location + ' , Boston, MA']
  }
  if (event.address.indexOf('Brookline') != -1) {
    places = [event.address, event.location + ' , ' + event.address, event.location + ' , Brookline, MA']
  }
  if (event.location == 'Green Building') {
    places = [event.location + ' , MIT, Cambridge, MA', event.location + ' , MIT, Cambridge, MA', event.location + ' , ' + event.address]
  }
  if (isClassroom(event.location)) {
    places = [getBuildingNumber(event.location) + ' , ' + event.address, event.address, getBuildingNumber(event.location) + ' , MIT, Cambridge, MA']
    if (getBuildingNumber(event.location) == 'Building 10')
      places[0] = 'Building 10, MIT, Cambridge, MA'
    if (getBuildingNumber(event.location) == 'Building 32')
      places[0] = 'Stata Center, MIT, Cambridge, MA'
    if (getBuildingNumber(event.location) == 'Building 54')
      places[0] = 'Green Building, MIT, Cambridge, MA'
    if (getBuildingNumber(event.location) == 'Building 56')
      places[0] = 'Whitaker Building, MIT, Cambridge, MA'
  }
  getLatLng(places[0], function(result1) {
    if (isdefined(result1)) {
       callback(result1)
    } else {
      getLatLng(places[1], function(result2) {
        if (isdefined(result2)) {
          callback(result2)
        } else {

		      getLatLng(places[2], function(result3) {
				    if (isdefined(result3)) {
				      callback(result3)
				    } else {
				      callback(null)
				    }
				  })
        
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

function getMarkerIconForClass(str) {
  var colorString = md5(str).substring(0,6)
  return 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|' + colorString
}

function addMarkerForPlace(place) {
  addMarkerForEvent({'id': 134095, 'location': place})
}

function clickMarkerById(eventid) {
google.maps.event.trigger(markersById[eventid], 'click')
}

function addMarkerForEvent(event) {
  if (!getGoogleMap()) return
  //console.log('addMarkerForEvent: ' + event.location)
  if (isdefined(markersById[event.id])) {
    if (markersById[event.id].getMap() != getGoogleMap())
      markersById[event.id].setMap(getGoogleMap())
    setMarkerPositionForEvent(event)
    return
	}
		      var marker = new google.maps.Marker({
		        //  'position': latlng,
		        'icon': getMarkerIconForClass(event.subjectname),
		        })
		      oms.addMarker(marker)
		      //marker.setMap(getGoogleMap())
		      markersById[event.id] = marker

          google.maps.event.addListener(marker, 'click', function() {
          //oms.addListener('click', function(nmarker) {
            if (isdefined(currentlyOpenInfoWindow) && isdefined(currentlyOpenInfoWindow.close)) {
              currentlyOpenInfoWindow.close()
            }
            var nmarker = this
            console.log(nmarker)
            currentlyOpenInfoWindowEventId = event.id
            
            currentlyOpenMarker = nmarker
            currentlyOpenInfoWindow = new google.maps.InfoWindow({
              'content': getEventHtmlBox(getLatestEvent(event)),
            })
            currentlyOpenInfoWindow.open(getGoogleMap(), nmarker)
          })
        
        setMarkerPositionForEvent(event)
        /*
        getLatLngForEvent(event, function(latlng) {
          marker.setPosition(latlng)
          marker.setMap(getGoogleMap())
          markersById[event.id] = marker
        })
        */
      }

function getLatLng(str, callback) {
  now.geocode(str, function(result) {
    if (result == null) callback(null)
    else {
      callback(new google.maps.LatLng(result.lat, result.lng))
    }
  })
}

function getLatLngReal(str, callback) {
        if (!isdefined(geocoder)) {
          //if (callback) callback(null)
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

function setMarkerPositionForEvent(event) {
  if (!isdefined(markersById[event.id])) return
  if (markersById[event.id].getPosition() != null) return
  getLatLngForEvent(event, function(latlng) {
    var marker = markersById[event.id]
    if (latlng == null) {
      console.log('couldnt find geoloc for ' + evevnt.id)
    } else if (isdefined(marker)) {
      marker.setPosition(latlng) 
    }
  })
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
oms = null

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
        oms = new OverlappingMarkerSpiderfier(googleMap,
          {markersWontMove: false, markersWontHide: false, keepSpiderfied: true});
        //$('#map_canvas').height(500)
        setGeoLocationMarker()
      
      /*
      setTimeout(function() {
    $('#map_canvas').height($(window).height() - $('#map_canvas').offset().top - 50)
    setTimeout(function() {

    getGoogleMap().setCenter(new google.maps.LatLng(42.3590995, -71.0934608))
    google.maps.event.trigger(getGoogleMap(), 'resize')
    getGoogleMap().setCenter(new google.maps.LatLng(42.3590995, -71.0934608))
    //$('#map_canvas').height($(window).height() - $('#map_canvas').offset().top - 50)
    
    }, 500)
    

  }, 500)
  */
      
      }
