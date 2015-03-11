var yz = window.yz || {};
yz.FourMaps = function(config) {

  if (!config) {
    throw 'Required options / config to continue.';
  }

  if (!config['4sq_oauth_token']) {
    throw 'Foursquare oauth token required.'
  }

  var _config = $.extend(config, {});

  var ELE_MAP     = 'checkins_map',
      ELE_LIST    = 'checkins_list',
      DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a',
      GROUND_ZERO =  _config['latlng_start'] || [37.57787402417704, -122.34639102139646], // Burlingame Farmer's Market
      FOURSQUARE_CHECKINS_ENDPOINT = 'https://api.foursquare.com/v2/users/self/checkins?jsoncallback=1?';

  var map,
      popup           = L.popup({
        'minWidth' : 375,
        'maxWidth' : 500
      }),
      _markers        = {},
      _markers_count  = 0;

  /**
   * Resize event handlers
   */
  var _resize = function() {
    $('#' + ELE_MAP).css({
      'height' : $(window).height()
    });
  }

  $(window).resize(_resize);
  _resize();

  /**
   * @param {timestamp}
   * @param {function} callback
   */
  var _fetchCheckins = function(before_timestamp, callback) {
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
   * Open a Venue in a Leaflet.Popup with checkin times
   * @param {string} venue_id
   */
  var _popupVenue = function(venue_id) {
    if (!(venue_id && _markers[venue_id])) {
      return;
    }

    var info = _markers[venue_id];

    popup
      .setLatLng(info.latlng)
      .setContent([
        '<div class="popup">',
          '<strong>' + info.title + '</strong><ul><li>',
            info.times.join('</li><li>'),
          '</li></ul>',
        '</div>'
      ].join(''))
      .openOn(map);
  }

  /**
   * Render markers
   * @param {object literal}
   */
  var _processCheckins = function(checkins) {

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

      // some venues need not be shown.
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

      // if existing market
      if (_markers[venue.id] && _markers[venue.id].instance) {
        _markers[venue.id].times.push(t);
        continue;
      }

      // create new marker
      _markers[venue.id] = {
        title   : venue.name,
        latlng  : [location.lat, location.lng],
        times   : [t],
        instance : L.marker(
          [location.lat, location.lng], {
            title : venue.name,
          }
        ).addTo(map)
         .on('click', (function(venue_id) {
          return function() {
            _popupVenue(venue_id);
          }
         })(venue.id))
      };
    }

    $('#' + ELE_LIST).find('ul').append(html_list.join(''));
  }

  /**
   * Let's figure how to handle Foursquare API response
   * {object} Response
   */
  var _handleResponse = function(response) {

    total_checkins  = response.response.checkins.count,
    checkins        = response.response.checkins.items,
    checkin         = null;

    if (_markers_count + checkins.length < total_checkins) {
      var last = checkins[checkins.length - 1];
      if (last) {
        window.setTimeout(function() {
          _fetchCheckins(last.createdAt, _handleResponse);
        }, 500);
      }
    }

    _processCheckins(checkins);

  };

  /**
   * Start the party
   */
  var init = function() {
    map = L.map(ELE_MAP).setView([GROUND_ZERO[0], GROUND_ZERO[1]], 10);
    map
      .on('locationfound', function(e){
        map.setView(e.latlng, 13);
      })
      .on('locationerror', function(e){
        // TODO: error
      })
      .locate();

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    $('#' + ELE_LIST)
      .show()
      .on('click', 'li', function(event) {
        var target = $(event.target).closest('li');
        if (target) {
          var venue_id = target.attr('data-venue-id');
          if (venue_id) {
            event.preventDefault();
            _popupVenue(venue_id);
          }
        }
      });

    // start getting ....
    _fetchCheckins(null, _handleResponse);
  }

  init();
};