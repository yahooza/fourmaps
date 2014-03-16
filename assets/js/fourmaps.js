var yz = window.yz || {};
    yz.FourMaps = function(config) {

      if (!config) {
        throw 'Required options / config to continue';
      }

      var _config = $.extend(config, {});

      var DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a',
          GROUND_ZERO = [37.668821, -122.080796],
          ELE_MAP     = 'checkins_map',
          ELE_LIST    = 'checkins_list';

      var map,
          w, h,
          mobile_max_w    = 480,
          infowindow      = new google.maps.InfoWindow(),
          _markers        = {},
          _markers_count  = 0;

      var _get_width = function() {
        return $(window).width();
      }

      var _resize = function() {
        $('#' + ELE_MAP).css({
          'height' : $(window).height()
        });
      }
      $(window).resize(_resize);
      _resize();
      w = _get_width();

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

        $.getJSON("https://api.foursquare.com/v2/users/self/checkins?jsoncallback=1?", params, callback);

      }

      /**
       * Render markers
       * @param {object literal}
       */
      var _render_checkins = function(checkins, can_show_home) {

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

            // not my home
            if (!can_show_home && "4fded9b4e4b05991756923c5" === venue.id) {
              continue;
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

          $('#' + ELE_LIST + ' ul').append(html_list.join(''));
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
        /*
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.BOTTOM_CENTER
        },
        */
        panControl: (w > mobile_max_w),
        /*
        panControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT
        },
        */
        zoomControl: (w > mobile_max_w),
        /*
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.LEFT_TOP
        },
        */
        scaleControl: (w > mobile_max_w),
        scaleControlOptions: {
            position: google.maps.ControlPosition.BOTTOM_LEFT
        },
        streetViewControl: false
      });


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

          });
        }

};