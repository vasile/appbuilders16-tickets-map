$(document).ready(function(){
    var ua_is_mobile = navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('Android') !== -1;
    if (ua_is_mobile) {
        $('body').addClass('mobile');
    }
  
    var header_title = $('h1').html();
    var map_styles = [
       {
          "featureType": "poi",
          "stylers":[
             {
                "visibility": "off"
             }
          ]
       },
       // { 
       //    "featureType": "administrative.country",
       //    "stylers": [
       //       {
       //          "visibility": "off"
       //       }
       //    ]
       // },
       {
          featureType: 'poi.park',
          stylers:[
             {
                visibility: 'off'
             }
          ]
       },
       {
          featureType: 'road.highway',
          elementType: 'labels',
          stylers:[
             {
                visibility: 'off'
             }
          ]
       },
       {
          "elementType": "geometry",
          "stylers":[
             {
                "lightness": 30
             }
          ]
       }
    ];
    
    var map = new google.maps.Map($('.page_container')[0], {
        center: new google.maps.LatLng(48.4,15.2),
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: map_styles,
        maxZoom: 11
    });

    map.addListener('idle', function() {
      // console.log(map.getCenter().toUrlValue());
      // console.log(map.getZoom());
    });
    
    function setScale(map, inner, outer, scale) {
        return function() {
            if (scale == 1) {
                outer.setMap(null);
                inner.setClickable(true);
            } else {
                var icono = outer.get('icon');
                icono.strokeOpacity = Math.cos((Math.PI/2) * scale);
                icono.fillOpacity = icono.strokeOpacity * 0.5;
                icono.scale = Math.sin((Math.PI/2) * scale) * 15;
                outer.set('icon', icono);

                var iconi = inner.get('icon');
                var newScale = (icono.scale < 3.0 ? 0.0 : 3.0);
                if (iconi.scale != newScale) {
                    iconi.scale = newScale;
                    inner.set('icon', iconi);
                    if (!inner.getMap()) {
                        inner.setMap(map);
                    } 
                }
            }
        }
    }
    
    var infowindow = new google.maps.InfoWindow();
    
    google.maps.event.addListener(map, 'click', function(ev) {
        infowindow.close();
    });

    function l(what) {
      console.log(what);
    }

    function getFeatureHTML(rowData, location) {
      var title = rowData.properties.title;
      var subtitle = rowData.properties.subtitle;

      var html = '<div data-x="' + location.lng() + '" data-y="' + location.lat() + '"><strong>' + title + '</strong> <img src="static/flags/24/' + rowData.properties.ticket_country_code + '.png" /><br/>' + subtitle + '</div>';
      return html;            
    }

    var orders_total = 0;
    
    function renderFeature(rowData) {
      $('#time').text(rowData.properties.subtitle);

      var p_x = rowData.geometry.coordinates[0];
      var p_y = rowData.geometry.coordinates[1];
      var location = new google.maps.LatLng(p_y, p_x);

      $('#orders').prepend(getFeatureHTML(rowData, location)).find(':first').slideUp(0).slideDown('fast');

      orders_total += 1;
      $('#orders_total').html(orders_total);

      var marker_color = '#FF0000';

      var outer = new google.maps.Marker({
          position: location,
          clickable: false,
          icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillOpacity: 0.5,
              fillColor: marker_color,
              strokeOpacity: 1.0,
              strokeColor: marker_color,
              strokeWeight: 1.0,
              scale: 0
          },
          optimized: false,
          map: map
      });

      var inner = new google.maps.Marker({
          position: location,
          clickable: false,
          icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillOpacity: 1.0,
              fillColor: marker_color,
              strokeWeight: 0,
              scale: 0
          },
          optimized: false
      });

      google.maps.event.addListener(inner, 'click', function() {
        var html = '<div class="iw_map">' + getFeatureHTML(rowData, location) + '</div>';
        infowindow.setContent(html);
        infowindow.open(map, inner);
      });

      for (var i = 0; i <= 10; i++) {
        setTimeout(setScale(map, inner, outer, i / 10), i * 100);
      }
    }

    $('#orders').on('click', 'div', function(){
      var p_x = parseFloat($(this).attr('data-x'));
      var p_y = parseFloat($(this).attr('data-y'));
      var location = new google.maps.LatLng(p_y, p_x);
      map.panTo(location);
      var zoomTo = 12;
      if (map.getZoom() < zoomTo) {
        map.setZoom(zoomTo);
      }
    });

    $.getJSON('static/people-appbuilders16.geojson?v=1', function(geojson){
      var row_id = 0;
      var country_stats = {};

      function updateFeature() {
        // if (row_id >= 10) {
        //   clearInterval(updateInterval);
        //   return;
        // }

        if ((typeof geojson.features[row_id]) === 'undefined') {
          clearInterval(updateInterval);
          return;
        }

        var f = geojson.features[row_id];

        var country_code = f.properties.ticket_country_code;
        if ((typeof country_stats[country_code]) === 'undefined') {
          country_stats[country_code] = {
            country_code: country_code,
            people_count: 0
          };
        }
        country_stats[country_code].people_count += 1;

        (function(){
          var country_values = [];
          for(country_code in country_stats) {
            country_values.push(country_stats[country_code]);
          }

          function sort_by_tickets_no(a, b) {
            if (a.people_count < b.people_count) {
              return 1;
            } else if (a.people_count > b.people_count) {
              return -1;
            }
            return 0;
          }
          country_values.sort(sort_by_tickets_no);

          var country_spans = [];
          $.each(country_values, function(idx, country_data){
            country_span = '<img src="static/flags/24/' + country_data.country_code + '.png" /> <span class="badge">' + country_data.people_count + '</span>';
            country_spans.push(country_span);
          });
          $('#countries_stats').html(country_spans.join(' '));
        })();

        clearInterval(updateInterval);
        return;

        renderFeature(f);

        row_id += 1;
      }
      var updateInterval = setInterval(function(){
        updateFeature();
      }, 300);
    });
});