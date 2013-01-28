
  email = 'guest@MIT.EDU'
  fullname = 'Guest User'
  
  newstart = ''
  newend = ''

  function getUrlParameters() {
    var map = {}
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      map[key] = decodeURI(value)
    })
    return map
  }
  
  getEvents = function(callback) { callback([]) }

  function listEvents() {
    return $('#calendar').weekCalendar('serializeEvents')
  }
  
  function isAttending(event) {
    if (!isdefined(event) || !isdefined(event.participants)) return false
    for (var i = 0; i < event.participants.length; ++i) {
      if (event.participants[i].email == email)
        return true
    }
    return false
  }
  
  function canDelete(event) {
    if (!isdefined(event) || !isdefined(event.participants) || event.participants.length == 0) return true
    if (isAttending(event) && event.participants.length <= 1) return true
    return false
  }

  function joinByNewlines(lines) {
    var output = $('<span>')
    for (var i = 0; i < lines.length; ++i) output.append($('<div>').text(lines[i]))
    return output.html()
  }
  
  function pushIfDefined(list, elem) {
    if (isdefined(elem)) list.push(elem)
  }
  
  function locationChanged() {
    //console.log('typed something!')
    if ($('#location').val && $('#location').val().length >= 1) {
      $('#createPartyButton').removeAttr('disabled').css('opacity', 1.0)
    } else {
      $('#createPartyButton').attr('disabled', true).css('opacity', 0.5)
    }
  }

  $(document).ready(function() {
	  $( "#dialog-modal" ).hide();
	  $( "#dialog" ).hide();
	  
	  if (isdefined($.cookie('email'))) {
	    email = $.cookie('email')
	  } else {
      // redirect to login page
      window.location = '/login.html'
	  }
	  if (isdefined($.cookie('fullname'))) {
	    fullname = $.cookie('fullname')
	  } else {
      // redirect to login page
      window.location = '/login.html'
	  }
    
    var $calendar = $('#calendar').weekCalendar({
      timeslotsPerHour: 4,
      timeslotHeight: 20,
      scrollToHourMillis : 0,
      allowCalEventOverlap: true,
      overlapEventsSeparate: true,
      totalEventsWidthPercentInOneColumn: 90,
      height: function($calendar){
        return $(window).height() - $('h1').outerHeight(true);
      },
      eventRender : function(calEvent, $event) {
        if (isdefined(calEvent.subjectname)) {
          $event.css('backgroundColor', stringToColor(calEvent.subjectname))
        }
        if (isAttending(calEvent)) {
          $event.css('font-weight', 'bold')
          $event.find('.wc-time').css('backgroundColor', 'green').css('border', '1px solid #888').css('color', 'white').css('font-weight', 'bold')
        }
        if(calEvent.end.getTime() < new Date().getTime()) {
          //$event.css('background-color', '#aaa');
          //$event.find('.time').css({'backgroundColor': 'black', 'border':'1px solid #888'});
          $event.css('opacity', '0.5')
        }
      },
	    eventAfterRender: function(calEvent, $event) {
	      if (isdefined(calEvent)) {
	        var infoBits = []
	        pushIfDefined(infoBits, calEvent.subjectname)
	        pushIfDefined(infoBits, calEvent.partyname)
	        pushIfDefined(infoBits, calEvent.location)
	        if (isdefined(calEvent.participants) && isdefined(calEvent.participants.length)) {
	          pushIfDefined(infoBits, calEvent.participants.length + ' attending')
	        }
	        $event.find('.wc-title').html(joinByNewlines(infoBits))
	      }
	      if (!canDelete(calEvent)) {
	        $event.find('.wc-cal-event-delete').remove()
	      }
	    },
      eventNew : function(calEvent, $event) {
        //console.log(calEvent)
        newstart = calEvent.start
        newend = calEvent.end
        //console.log(calEvent.start.toString())
        //console.log(calEvent.end.toString())
        //console.log($event)
        if (activeClasses().length == 0) {
          alert('need to add some classes before you can start adding events! see the search box in the top-right corner!')
          $('#calendar').weekCalendar('removeUnsavedEvents')
          return
        }
        $('#createPartyButton').attr('disabled', true).css('opacity', 0.5)
        $( "#dialog-modal" ).dialog({
          height: 300,
          modal: true,
          open: function(event, ui) { $('.ui-widget-overlay').bind('click', function(){ $("#dialog-modal").dialog('close'); }); },
          position: {my:"bottom", at:"top", of:$event, collision:"fit"},
          show:"clip",
          //hide:"clip",
          beforeClose: function() {
            $('#calendar').weekCalendar('removeUnsavedEvents')
          }
        });
        $('#subjectname').html('')
        var classes = activeClasses()
        for (var i = 0; i < classes.length; ++i) {
          var classname = classes[i]
          $('#subjectname').append($('<option>').attr('value', classname).text(classname))
        }
      },
      draggable: function(calEvent,element) {
        return false
      },
      eventDelete: function(calEvent, element, dayFreeBusyManager, calendar, clickEvent) {
        console.log(calEvent.id)
        console.log(calEvent.subjectname)
        now.deleteEvent(calEvent.subjectname, calEvent.id, function() {
          refresh()
          refreshMap()
        })
      },
      eventClick: function(calEvent, $event) {
         $( "#dialog" ).dialog({
          height: 300,
          modal: true,
          open: function(event, ui) { $('.ui-widget-overlay').bind('click', function(){ $("#dialog").dialog('close'); }); },
          position: {my:"top", at:"bottom", of:$event, collision:"fit"},
		      show:"clip",
		      //hide:"clip",
        });
        displayedEvent = calEvent
        populateEventInfoDisplay(calEvent)
      },
      data: function(start, end, callback) {
        getEvents(callback)
      }
    });
  });


function getUser() {
  return {'email': email, 'fullname': fullname}
}

displayedEvent = {}

joinOrLeaveClicked = function() {
  if ($('#joinOrLeave').text() == 'Join') {
    now.joinEvent(displayedEvent, getUser())
  } else {
    now.leaveEvent(displayedEvent, getUser())
    if (activeClasses().indexOf(displayedEvent.subjectname) == -1) {
      $('.ui-dialog-titlebar-close').trigger('click')
      refresh()
    }
  }
}

function deleteEventClicked() {
  now.deleteEvent(displayedEvent.subjectname, displayedEvent.id)
  $('.ui-dialog-titlebar-close').trigger('click')
  //refresh()
}

function populateEventInfoDisplay(event) {
  //console.log(event)
  $('#ui-dialog-title-dialog').text(event.partyname)
  $('#classInfo').text(event.subjectname)
  $('#eventTimeInfo').text(moment(event.start).calendar())
  $('#locationInfo').text(event.location)
  addMarkerForEvent(event)
  if (isdefined(markersById) && isdefined(markersById[displayedEvent.id]) && isdefined(markersById[displayedEvent.id].getMap()) /*&& isdefined(markersById[displayedEvent.id].getPosition())*/) {
    $('#locationInfo').html($('<a>').attr('href', '#').text(event.location).click(function() {
        setMarkerPositionForEvent(event)
        $('.ui-dialog-titlebar-close').trigger('click')
        $("#mapSwitchTab").click()
        google.maps.event.trigger(markersById[displayedEvent.id], 'click')
      })
    )
  }
  $('#numberOfPeopleInfo').text(event.participants.length)
  $('#attendeeListInfo').html(printParticipants(event.participants))
  //console.log(isAttending(event))
  if (canDelete(event)) {
    $('#deleteEvent').show()
  } else {
    $('#deleteEvent').hide()
  }
  if (isAttending(event)) {
    $('.ui-dialog-titlebar').css('backgroundColor', 'green')
    $('.ui-dialog-titlebar').css('color', 'white')
    //$('.ui-icon-closethick').css('backgroundColor','white')
    $('#joinOrLeave').text('Leave')
  } else {
    $('.ui-dialog-titlebar').css('backgroundColor', 'rgb(251, 165, 44)')
    $('.ui-dialog-titlebar').css('color', 'white')
    //$('.ui-icon-closethick').css('backgroundColor','')
    $('#joinOrLeave').text('Join')
  }
}

