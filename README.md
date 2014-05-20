# fourmaps
Plot your Foursquare check-ins onto a Leaflet map.

### Tools:

* [jQuery](http://jquery.com)
* [Leaflet](http://leafletjs.com)
* [Foursquare API](https://developer.foursquare.com)
* [MomentJs](http://momentjs.com)

### Config
```
var fourmaps = new yz.FourMaps({
  '4sq_oauth_token' : '{YOUR_FOURSQUARE_OAUTH_TOKEN}',
  'latlng_start'    : ['{STARTING_POINT_LAT}', {STARTING_POINT_LNG}],
  'excluded_venues' : [
    '' // exclude these venue ids...
  ]
});
```

### Demo

* See the [demo page](http://yahooza.github.io/fourmaps/demo.html?oauth_token=FLVROYFL0YF1GXJK1GJHUM2HYIG4MG5IULV50KQUNZB2WBTT)
