var yz = window.yz || {};
yz.FourMaps = function(config) {

  if (!config) {
    throw 'Required options / config to continue.';
  }

  if (!config['4sq_oauth_token']) {
    throw 'Foursquare oauth token required.'
  }

  var _config = $.extend(config, {});

  var DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a',
      GROUND_ZERO = [37.668821, -122.080796],
      ELE_MAP     = 'checkins_map',
      ELE_LIST    = 'checkins_list',
      FOURSQUARE_CHECKINS_ENDPOINT = 'https://api.foursquare.com/v2/users/self/checkins?jsoncallback=1?';

  var map,
      w, h,
      mobile_max_w    = 480,
      infowindow      = new google.maps.InfoWindow(),
      _markers        = {},
      _markers_count  = 0;

  /**
   * Get Viewport Width
   */
  var _getViewportWidth = function() {
    return $(window).width();
  }

  var _resize = function() {
    $('#' + ELE_MAP).css({
      'height' : $(window).height()
    });
  }

  $(window).resize(_resize);
  _resize();
  w = _getViewportWidth();

  /**
   * @param {timestamp}
   * @param {function} callback
   */
  var _fetch = function(before_timestamp, callback) {

    var params = {
      'v'               : '20130101',
      'limit'           : 250,
      'oauth_token'     : _config['4sq_oauth_token'],
      'format'          : "json"
    };

    if (before_timestamp) {
      params['beforeTimestamp'] = before_timestamp;
    }

    $.getJSON(FOURSQUARE_CHECKINS_ENDPOINT, params, callback);

  }

  /**
   * Render markers
   * @param {object literal}
   */
  var _render_checkins = function(checkins) {

      if (!checkins) {
        return;
      }

      var checkin,
          marker,
          venue,
          location,
          html_list = [];

      for (var i=0, len=checkins.length; i<len; i++) {

        checkin   = checkins[i];

        // if no venue, NO.
        if (!checkin.venue) {
          continue;
        } 

        venue     = checkin.venue;
        location  = venue.location;

        if (_config['excluded_venues'] && _config['excluded_venues'].length > 0) {
          if ($.inArray(venue.id, _config['excluded_venues']) !== -1) {
            continue;
          }
        }

        _markers_count++;

        var m = moment(checkin.createdAt * 1000),
            t = m.format(DATE_FORMAT) + ' <time>(' +  m.fromNow() + ')</time>';

        html_list.push([
          '<li ',
            'data-venue-id="' + checkin.venue.id + '"',
            '>',
            '<strong>',
              checkin.venue.name,
            '</strong>',
            '<time>' + moment(checkin.createdAt * 1000).fromNow() + '</time>',
          '</li>'
        ].join(''));

        if (_markers[venue.id]) {
          _markers[venue.id].times.push(t);
          continue;
        }

        // create a new Marker
        _markers[venue.id] =  new google.maps.Marker({
          position          : new google.maps.LatLng(location.lat, location.lng),
          map               : map,
          disableDefaultUI  : true,
          animation         : google.maps.Animation.DROP,
          title             : venue.name,
          times             : [t]
        });
        
        google.maps.event.addListener(_markers[venue.id], 'click', (function(marker, venue_id) {

          return function() {
            infowindow.close();

            // map.setCenter(marker.getPosition());
            map.panTo(marker.getPosition());
            infowindow.setContent([
              '<div class="infowindow">',
              '<strong>' + marker.getTitle() + '</strong><ul><li>',
              _markers[venue_id].times.join('</li><li>'),
              '</li></ul>',
              '</div>'
            ].join(''));

            infowindow.open(map, marker, venue_id);
          }

        })(_markers[venue.id], venue.id));

      }

      $('#' + ELE_LIST).find('ul').append(html_list.join(''));
  }

  var _plot = function(response) {

    total_checkins  = response.response.checkins.count,
    checkins        = response.response.checkins.items,
    checkin         = null,
    can_show_home   = false;

      if (w < mobile_max_w) {
        checkin = checkins.shift();
        can_show_home = true;
        map.panTo(new google.maps.LatLng(checkin.venue.location.lat, checkin.venue.location.lng));
        checkins = [checkin];
      } else {
        if (_markers_count + checkins.length < total_checkins) {
          var last = checkins[checkins.length - 1];
          if (last) {
            window.setTimeout(function() {
              _fetch(last.createdAt, _plot);
            }, 10);
          }
        }
      }

      _render_checkins(checkins, can_show_home);

  };

  map = new google.maps.Map(document.getElementById(ELE_MAP), {
    center      : new google.maps.LatLng(GROUND_ZERO[0], GROUND_ZERO[1]),
    zoom        : (w > mobile_max_w) ? 10 : 14, // (0-18)
    mapTypeId   : google.maps.MapTypeId.TERRAIN, // TERRAIN|ROADMAP|SATELLITE|HYBRID
    mapTypeControl: false,
    panControl: (w > mobile_max_w),
    zoomControl: (w > mobile_max_w),
    scaleControl: (w > mobile_max_w),
    scaleControlOptions: {
        position: google.maps.ControlPosition.BOTTOM_LEFT
    },
    streetViewControl: false
  });

  // start getting ....
  _fetch(null, _plot);

  if (w > mobile_max_w) {

    google.maps.event.addListener(map, 'click', function() {
      infowindow.close();
    });

    $('#' + ELE_LIST).on('click', 'li', function(event) {

        var target = $(event.target).closest('li');
        if (!target) {
          return;
        }

        event.preventDefault();

        var venueId = target.attr('data-venue-id');
        if (!venueId) {
          throw new Error('Venue Id cannot be empty');
        }

        var marker = _markers[venueId];
        google.maps.event.trigger(marker, 'click');

      })
      .fadeIn(1000, function() {
        // TODO: what now?
      });
    }

};