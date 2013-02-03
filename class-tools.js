classlist = []
  
function classlistCallback( request, response ) {
                var t = jQuery.grep(classlist, function(a){
                        var patt = new RegExp("^" + request.term, "i");
                        return (a.match(patt));
                    });
                response(t);
            }

  function loggedIn() {
    getEvents = function(callback) {
      now.getEventsForUser(email, function(events) {
        for (var i = 0; i < events.length; ++i) {
          if (events[i].id == displayedEvent.id)
            populateEventInfoDisplay(events[i])
        }
        if (haveJoinedEvents() && isShowingCalendar) { showAddToCalendarButton() }
        else { $('#addToGoogleCalendar').hide() }
        //console.log('called getevents')
        callback(events)
      })
    }
    now.refreshUser = function() {
      refresh()
    }
    //$('.ui-button-text').filter(function() { return $(this).text() == 'today'}).click()
    $("#calendar").weekCalendar("refresh")
    $('#location').autocomplete(
      {
        autoFocus: true,
        source: now.location_list
      }
    )
    now.getClassesWithPrefix('', function(nclasslist) {
      classlist = nclasslist
      //for (var i = 0; i < classlist.length; ++i) {
      //  $('#classDataList').append($('<option>').attr('value', classlist[i]))
      //}
      $('#classSearchBox').autocomplete(
        {
          autoFocus: true,
          source: classlistCallback,
          delay: 0,
          sortResults:false,
          select: function(event, ui) {
            $('#classSearchBox').val(ui.item.value)
            $('#classSearchBox').submit()
            //classAdded(ui.item.value)
            //$('#classSearchBox').val('')
            setTimeout(function() {$('#classSearchBox').val('')},10)
          },
        })
    })
    now.getClasses(email, function(classes) {
      $.map(classes, function(classname) {
        addClassWidget(classname)
      })
      mayHaveNoClassesLeft()
    })
    refresh()
    //setTimeout(function() {initializeMap()}, 1000)
  }
  
  authkeynum = Math.floor(Math.random()*9007199254740992)
  authenticationloop = {}
  
  function loginMIT() {
    $('#authenticationIframe').attr('src', 'https://gkovacs.scripts.mit.edu:444/login2.py?key=' + authkeynum)
    authenticationloop = setInterval(function() {
      now.getAuthenticated(authkeynum, function(newuserinfo) {
        email = newuserinfo.email
        fullname = newuserinfo.fullname
        clearInterval(authenticationloop)
        $('#loginButton').hide()
        loggedIn()
      })
    }, 100)
  }
  
  now.ready(function() {
    loggedIn()
    initializeMap()
    //loginMIT()
    //now.getAuthenticated(authkeynum, function(userinfo) {
    //  email = userinfo.email
    //  fullname = userinfo.fullname
    //})
  })
  
  function isdefined(x) {
    return (typeof x !== 'undefined' && x !== null)
  }
  
  function sanitizeClassName(x) {
    return x.split('.').join('-')
  }
  
  function activeClasses() {
    return $.map($('.classitem'), function(x) { return $(x).attr('classname') })
  }
  
  function refresh() {
    $('#calendar').weekCalendar('refresh')
    refreshEventsMap()
    refreshMap()
  }
  
  function mayHaveNoClassesLeft() {
    if (activeClasses().length > 0) return
    getEvents(function(events) {
      if (events.length > 0) return
      if (activeClasses().length > 0) return
      $.gritter.removeAll()
      $.gritter.add({'title': '<div style="text-align: center">Add Classes →</div>', 'text': '<div style="text-align: center">Add your classes to find pset parties</div>', 'sticky': true})
      $('#gritter-notice-wrapper').click(scrollToTop)
    })
  }
  
  function addClassWidget(classname) {
    $.gritter.removeAll()
    if (activeClasses().indexOf(classname) != -1) return
    $('#classlist')
      .prepend(
        $('<div>')
          .css('float', 'left')
          .addClass('C' + sanitizeClassName(classname))
          .addClass('classitem')
          .attr('classname', classname)
          .append(
            $('<span>')
              .text(classname)
              .css('background-color', stringToColor(classname))//'#fba52c')
              .css('color', 'white')
			  .css('border-radius', '10px')
			  .css('padding', '10px')
			  .css('text-shadow', '0px -1px 1px #704811')
			  .css('filter', 'dropshadow(color=#704811, offx=0, offy=-1)')
			  .css('-webkit-box-shadow', '1px 1px 6px 0px #424242')
              .css('box-shadow', '1px 1px 6px 0px #424242')
          )
          .append(
            $('<button>')
              .text('X')
              .css('cursor', 'pointer')
			  .css('background-color', 'transparent')
			  .css('color', '#fba52c')
			  .css('border', 'none')
              .click(function() {
                $('.C' + sanitizeClassName(classname)).remove()
                now.removeClass(email, classname, function() {
                  refresh()
                  refreshMap()
                  mayHaveNoClassesLeft()
                })
                return false
              })
          )
      )
  }
  
  function classAdded(classname) {
    if (!isdefined(classname))
      classname = $('#classSearchBox').val()
    console.log(classname)
    if (!isdefined(classname) || classname == '') return false
    $('#classSearchBox').val('')
    var active = activeClasses()
    if (active.length > 0 && active.indexOf(classname) != -1)
      return false
    if (!isdefined(classlist[classname])) {
      return false
      //now.addClassType(classname)
    }
    addClassWidget(classname)
    now.addClass(email, classname, function() {
      refresh()
      refreshMap()
    })
    return false
  }
  
  function eventCreated() {
    //$("#calendar").weekCalendar("removeUnsavedEvents")
    console.log('created')
    console.log(newstart)
    console.log(newend)
    var subjectname = $('#subjectname').val()
    var partyname = $('#partyname').val()
    var location = $('#location').val()
    if (!isdefined(location) || location == '') return
    var eventTitle = [subjectname, partyname, location].join('<br/>')
    var newevent = {
      'start': newstart,
      'end': newend,
      'title': eventTitle,
      'partyname': partyname,
      'location': location,
      'participants': [getUser()],
    }
    $('#partyname').val('')
    $('#location').val('')
    $(".ui-dialog-titlebar-close").trigger('click');
    console.log(newevent)
    console.log(subjectname)
    now.addEvent(subjectname, newevent, function(newid) {
      //refresh()
      now.joinEvent({'id': newid, 'subjectname': subjectname}, getUser())
    })
  }
  
  function scrollToTop() {
    $("html, body").animate({ scrollTop: 0 }, 600);
  }
