
  email = 'gkovacs@MIT.EDU'
  fullname = 'Geza Kovacs'
  
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

  $(document).ready(function() {
	  $( "#dialog-modal" ).hide();
	  $( "#dialog" ).hide();
    if (isdefined(getUrlParameters()['email'])) {
      email = getUrlParameters()['email']
    }
    if (isdefined(getUrlParameters()['name'])) {
      fullname = getUrlParameters()['name']
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
        if(calEvent.end.getTime() < new Date().getTime()) {
          $event.css('backgroundColor', '#aaa');
          $event.find('.time').css({'backgroundColor': '#999', 'border':'1px solid #888'});
        }
      },
	  
      eventNew : function(calEvent, $event) {
        //console.log(calEvent)
        newstart = calEvent.start
        newend = calEvent.end
        //console.log(calEvent.start.toString())
        //console.log(calEvent.end.toString())
        //console.log($event)
        $( "#dialog-modal" ).dialog({
          height: 300,
          modal: true,
			position: "left",
		  show:"clip",
		  hide:"clip",
        });
        $('#subjectname').html('')
        var classes = activeClasses()
        for (var i = 0; i < classes.length; ++i) {
          var classname = classes[i]
          $('#subjectname').append($('<option>').attr('value', classname).text(classname))
        }
      },
      eventDelete: function(calEvent, element, dayFreeBusyManager, calendar, clickEvent) {
        console.log(calEvent.id)
        console.log(calEvent.subjectname)
        now.deleteEvent(calEvent.subjectname, calEvent.id, function() {
          refresh()
        })
      },
      eventClick: function(calEvent, $event) {
         $( "#dialog" ).dialog({
          height: 300,
          modal: true,
			position: "right",
		  show:"clip",
		  hide:"clip",
        });
      },
      data: function(start, end, callback) {
        getEvents(callback)
      }
    });
  });

