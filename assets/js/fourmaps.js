var yz = window.yz || {};
yz.FourMaps = function(config) {

  if (!config) {
    throw 'Required options / config to continue.';
  }

  if (!config['oauth_token']) {
    throw 'Foursquare oauth token required.'
  }

  var _config = $.extend({
    'limit'         : 200,
    'map_latlng'    : '37.57787402417704,-122.34639102139646', // Burlingame Farmer's Market
    'map_level'     : 10
  }, config);

  _config['map_latlng'] = _config['map_latlng'].split(',');

  if (_config['after_timestamp']) {
    _config['after_timestamp'] = parseInt(_config['after_timestamp'], 10) + 1; // not inclusive
  }

  // NOTE: Just throw it away. Don't let it sit around to be used by the next guy.
  config = null;

  var ELE_MAP     = 'checkins_map',
      ELE_LIST    = 'checkins_list',
      DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a',
      FOURSQUARE_CHECKINS_ENDPOINT = 'https://api.foursquare.com/v2/users/self/checkins?jsoncallback=1?';

  var map,
      popup           = L.popup({
        'minWidth' : 375,
        'maxWidth' : 500,
        'offset'   : [0, -20]
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
      'limit'           : _config['limit'],
      'oauth_token'     : _config['oauth_token'],
      'format'          : 'json'
    };
    // Only fetch Checkins after this timestamp
    if (_config['after_timestamp']) {
      params['afterTimestamp'] = _config['after_timestamp'];
    }
    // Start the Checkin query before this timestamp
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
    map = L.map(ELE_MAP).setView(
      [
        _config['map_latlng'][0],
        _config['map_latlng'][1]
      ],
      _config['map_level']
    );
    map
      .on('locationfound', function(e){
        map.setView(e.latlng);
      })
      .on('locationerror', function(e){
        // TODO: error
      });

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
    _fetchCheckins(_config['before_timestamp'] || null, _handleResponse);
  }

  init();
};