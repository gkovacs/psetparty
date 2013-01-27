function stringToColor(str){
  return '#' + md5(str).substring(0,6)
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

function placeEvents() {
  var firstAcceptableTime = moment(new Date())
  var lastAcceptableTime = moment(new Date()).add('weeks', 1)
  getEvents(function(events) {
    for (var i = 0; i < events.length; ++i) {
      var event = events[i]
      var eventStartTime = moment(event.start)
      if (eventStartTime < firstAcceptableTime) continue
      if (eventStartTime > lastAcceptableTime) continue
      addMarkerForEvent(event, getEventHtmlBox(event))
    }
  })
}

markers = []

function clearMarkers() {
  for (var i = 0; i < markers.length; ++i) {
    var marker = markers[i]
    marker.setMap(null)
  }
  markers = []
}

function emailNamePair(x) {
  return $('<a>').attr('href', 'mailto:' + x[0]).attr('title', x[0]).attr('alt', x[0]).text(x[1])
}

function printParticipants(participants) {
  if (participants == null) {
    return $('<span>')
  } else {
    var output = $('<span>')
    for (var i = 0; i < participants.length; ++i) {
      var currentParticipant = emailNamePair(participants[i])
      output.append(currentParticipant)
    }
    return output
  }
}

function getEventHtmlBox(event) {
  return $('<div>').append(
    $('<div>').append($('<b>').text('What: ')).append($('<span>').text(event.partyname.toString()))
  ).append(
    $('<div>').append($('<b>').text('Where: ')).append($('<span>').text(event.location.toString()))
  ).append(
    $('<div>').append($('<b>').text('When: ')).append(moment(event.start).fromNow())
  ).append(
    $('<span>').append($('<b>').text('Who: ')).append(printParticipants(event.participants))
  ).html()
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


function addMarkerForEvent(event, infotext) {
        getLatLngForEvent(event, function(latlng) {
          var marker = new google.maps.Marker({
            'position': latlng,
          })
          markers.push(marker)
          var infoWindow = new google.maps.InfoWindow({
            'content': infotext,
          })
          google.maps.event.addListener(marker, 'click', function() {
            infoWindow.open(map, this)
          })
          marker.setMap(map)
        })
      }

function getLatLng(str, callback) {
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
