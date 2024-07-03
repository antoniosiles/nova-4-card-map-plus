<template>
    <card class="rounded flex flex-col" :style="'padding:5px;'">
        <div class="h-auto md:col-span-12 h-full" >
            <div class="scroll-wrap overflow-x-hidden overflow-y-auto flex-wrap bg-white flex w-auto" style="max-height: 288px;">
                <div class="w-auto">
                    <div class="px-4 py-2">
                        <label for="device-filter" class="block mb-3 mr-3 text-80 pt-2 leading-tight whitespace-nowrap">Dispositivo</label>
                        <select class="w-full form-control form-select form-input-bordered" id="device-filter" name="device-filter" v-model="filters.device" @change="filterData()">
                            <option value="0" >-- Seleccione --</option>
                            <option 
                                v-for="dev in filters.devices" 
                                :value="dev.id">
                                {{ dev.name }}
                            </option>
                        </select>
                    </div>
                </div>
                <div class="w-auto">
                    <div class="px-4 py-2">
                        <label for="date-filter" class="block mb-3 mr-3 text-80 pt-2 leading-tight whitespace-nowrap">Fecha</label>
                        <input type="date" class="w-full form-control form-input form-input-bordered" id="date-filter" name="date-filter" v-model="filters.date" @change="filterData()">
                    </div>
                </div>
                <div class="w-auto">
                    <div class="px-4 py-2">
                        <label for="time-start-filter" class="block mb-3 mr-3 text-80 pt-2 leading-tight whitespace-nowrap">Hora inicio</label>
                        <input type="time" class="w-full form-control form-input form-input-bordered" id="time-start-filter" name="time-start-filter" v-model="filters.timeStart" @change="filterData()">
                    </div>
                </div>
                <div class="w-auto">
                    <div class="px-4 py-2">
                        <label for="time-end-filter" class="block mb-3 mr-3 text-80 pt-2 leading-tight whitespace-nowrap">Hora fin</label>
                        <input type="time" class="w-full form-control form-input form-input-bordered" id="time-end-filter" name="time-end-filter" v-model="filters.timeEnd" @change="filterData()">
                    </div>
                </div>
                <div class="w-auto">
                    <div class="px-4 py-2">
                        <label for="time-end-filter" class="block mb-3 mr-3 text-80 pt-2 leading-tight whitespace-nowrap">Modo seguimiento</label>
                        <div style="font-size: 32px;">
                            <div class="p-switch p-fill pretty mt-1">
                                <input type="checkbox" value="" @change="filterData()" v-model="filters.watchMode"> 
                                <div class="state p-success">
                                    <label><font style="vertical-align: inherit;"><font style="vertical-align: inherit;">  </font></font></label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="px-4 pb-2" id="map-message" ></div>
        <div id="map" :style="'height:' + this.mapHeight"></div>
    </card>
</template>

<script>
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster";
import "leaflet.gridlayer.googlemutant";
import $Scriptjs from "scriptjs";
import { latLng, Icon, control, gridLayer } from "leaflet";
import 'leaflet.fullscreen';
// import PrettyCheckbox from 'pretty-checkbox-vue';
// import "pretty-checkbox/dist/pretty-checkbox.css";
//import "pretty-checkbox-vue/dist/pretty-checkbox-vue.js";

export default {
    props: [
        "card",
        "filters",
        // The following props are only available on resource detail cards...
        // 'resource',
        // 'resourceId',
        // 'resourceName',
    ],
    components: { /*PrettyCheckbox*/  },
    methods: {
        click: function (e) {
            //alert("clusterclick")
        },
        clearMap(){
            this.layerGroup.clearLayers();
            this.geoJsons.length = 0;
        },
        filterData() {
            if( this.filters.device == null || this.filters.device == undefined ){
                document.getElementById("map-message").innerHTML = "Seleccione una Dispositivo para cargar las locaciones";
                return;
            }
            if( this.filters.date == null || this.filters.date == undefined ){
                document.getElementById("map-message").innerHTML = "Seleccione una Fecha para cargar las locaciones";
                return;
            }
            if( this.filters.timeStart == null || this.filters.timeStart == undefined ){
                document.getElementById("map-message").innerHTML = "Seleccione una Hora de inicio para cargar las locaciones";
                return;
            }
            if( this.filters.timeEnd == null || this.filters.timeEnd == undefined ){
                document.getElementById("map-message").innerHTML = "Seleccione una Hora de fin para cargar las locaciones";
                return;
            }
            document.getElementById("map-message").innerHTML = "Espere por favor mientras se obtiene las locaciones";
            this.clearMap();
            const params = {
                date: this.filters.date,
                deviceId: this.filters.device,
                timeStart: this.filters.timeStart,
                timeEnd: this.filters.timeEnd,
                watchMode: this.filters.watchMode,
            }
            const config = {
                headers: { Authorization: `Bearer ${this.card.bearerToken}` }
            };
            axios
                .post(this.card.endpoint, params, config)
                .then(res => {
                    document.getElementById("map-message").innerHTML = "Cargando locaciones...";
                    if (this.card.type == "GeoJson") {
                        this.card.geoJson = res.data;
                        this.geoJsons.push(res.data.points);
                    }

                    let featureType = this.card.type;
                    let popup = this.card.popup;
                    var markers = L.markerClusterGroup({
                        disableClusteringAtZoom: 11,
                    });
                    var geo = L.geoJson(this.geoJsons, {
                        onEachFeature: function (feature, layer) {
                            if (featureType == "LatLon") {
                                layer.bindPopup(feature.properties.popupContent);
                            } else if (featureType == "GeoJson") {
                                layer.bindPopup(feature.properties[popup]);
                            }
                        },
                        pointToLayer: function (feature, latlng) {
                            return L.marker(latlng);
                        },
                    });
                    markers.addLayer(geo);
                    this.layerGroup.addLayer(markers);
                    if( res.data.polylines.lines != undefined && res.data.polylines.lines.length > 0  ){
                        var polylines = L.polyline(res.data.polylines.lines, res.data.polylines.style);
                        this.layerGroup.addLayer(polylines);
                        this.mapGlobal.flyTo([res.data.polylines.moveTo.latitude,res.data.polylines.moveTo.longitude], res.data.polylines.moveTo.zoom);
                    }
                    //this.layerGroup.fitBounds(geo.getBounds());
                    document.getElementById("map-message").innerHTML = "Locaciones cargadas";
                })
                .catch(err => {
                    console.log(err);
                    if( err.response.data.message != undefined ){
                        document.getElementById("map-message").innerHTML = err.response.data.message;
                    }else{
                        document.getElementById("map-message").innerHTML = "Ocurrio un error, pruebe nuevamente por favor";
                    }
                    
            });
        },
    },
    data() {
        let mapGlobal = null;
        var layerGroup = null;
        let geoJsons = [];
        console.log(this.card.devices);
        var filters = {
            device: 0,
            //devices: JSON.parse( this.card.devices ),
            devices: this.card.devices,
            date: new Date().toISOString().slice(0, 10),
            timeStart: "00:00",
            timeEnd: "23:59",
            watchMode: false
        };
        let base64img =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=";
        delete Icon.Default.prototype._getIconUrl;

        let base64ShadowUrl =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAQAAAACach9AAACMUlEQVR4Ae3ShY7jQBAE0Aoz/f9/HTMzhg1zrdKUrJbdx+Kd2nD8VNudfsL/Th///dyQN2TH6f3y/BGpC379rV+S+qqetBOxImNQXL8JCAr2V4iMQXHGNJxeCfZXhSRBcQMfvkOWUdtfzlLgAENmZDcmo2TVmt8OSM2eXxBp3DjHSMFutqS7SbmemzBiR+xpKCNUIRkdkkYxhAkyGoBvyQFEJEefwSmmvBfJuJ6aKqKWnAkvGZOaZXTUgFqYULWNSHUckZuR1HIIimUExutRxwzOLROIG4vKmCKQt364mIlhSyzAf1m9lHZHJZrlAOMMztRRiKimp/rpdJDc9Awry5xTZCte7FHtuS8wJgeYGrex28xNTd086Dik7vUMscQOa8y4DoGtCCSkAKlNwpgNtphjrC6MIHUkR6YWxxs6Sc5xqn222mmCRFzIt8lEdKx+ikCtg91qS2WpwVfBelJCiQJwvzixfI9cxZQWgiSJelKnwBElKYtDOb2MFbhmUigbReQBV0Cg4+qMXSxXSyGUn4UbF8l+7qdSGnTC0XLCmahIgUHLhLOhpVCtw4CzYXvLQWQbJNmxoCsOKAxSgBJno75avolkRw8iIAFcsdc02e9iyCd8tHwmeSSoKTowIgvscSGZUOA7PuCN5b2BX9mQM7S0wYhMNU74zgsPBj3HU7wguAfnxxjFQGBE6pwN+GjME9zHY7zGp8wVxMShYX9NXvEWD3HbwJf4giO4CFIQxXScH1/TM+04kkBiAAAAAElFTkSuQmCC";

        if (this.card.markerIcon == null) {
            Icon.Default.imagePath = ".";
            Icon.Default.mergeOptions({
                iconRetinaUrl: base64img,
                iconUrl: base64img,
                iconSize: [25,41],
                //popupAnchor: [0, -30],
                iconAnchor: [12,40],
                shadowUrl: base64ShadowUrl,
            });
        } else {
            Icon.Default.mergeOptions({
                iconRetinaUrl: this.card.markerIcon,
                iconUrl: this.card.markerIcon,
                iconSize: this.card.markerIconSize,
                iconAnchor: this.card.markerIconAnchor,
                shadowUrl: null,
                shadowAnchor: null,
            });
        }

        if (!this.card.height) {
            this.mapHeight = "300px";
        } else {
            this.mapHeight = this.card.height;
        }

        function IsJsonString(str) {
            if(str =! ""){
                    try {
                    JSON.parse(str);
                } catch (e) {
                    return geoJsons.push(str);
                }
                return geoJsons.push(JSON.parse(str));
            }else{
                return geoJsons
            }
        }

        if (this.card.googleApiKey && this.card.googleMapType) {
            this.visibleYesNoGoogle = true;
            this.visibleYesNoLeaflet = false;
        } else {
            this.visibleYesNoGoogle = false;
            this.visibleYesNoLeaflet = true;
        }

        if (this.card.type == "GeoJson") {
            IsJsonString(this.card.geoJson);
        } else if (this.card.type == "LatLon") {
            var geojsonCustom = {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [
                                this.card.longitude,
                                this.card.latitude,
                            ],
                        },
                        properties: {
                            popupContent: this.card.popup,
                        },
                    },
                ],
            };

            geoJsons.push(geojsonCustom);
        }

        return {
            options: {},
            geoJsons,
            filters
        };
    },
    mounted() {
        if (this.visibleYesNoGoogle) {
          $Scriptjs(
              "https://maps.googleapis.com/maps/api/js?key=" +
                  this.card.googleApiKey +
                  "&loading=async"
          );
        }
        if( this.card.fullScreen.show != undefined && this.card.fullScreen.show ){
            var map = L.map("map", {
                zoomControl: true,
                fadeAnimation: true,
                markerZoomAnimation: true,
                fullscreenControl: true,
                fullscreenControlOptions: {
                    position: this.card.fullScreen.position != undefined ? this.card.fullScreen.position : 'topleft', // change the position of the button can be topleft, topright, bottomright or bottomleft, default topleft
                    title: this.card.fullScreen.title != undefined ? this.card.fullScreen.title : 'Show me the fullscreen !', // change the title of the button, default Full Screen
                    titleCancel: this.card.fullScreen.titleCancel != undefined ? this.card.fullScreen.titleCancel : 'Exit fullscreen mode', // change the title of the button when fullscreen is on, default Exit Full Screen
                    content: this.card.fullScreen.content != undefined ? this.card.fullScreen.content : null, // change the content of the button, can be HTML, default null
                    forceSeparateButton: false, // force separate button to detach from zoom buttons, default false
                    forcePseudoFullscreen: false, // force use of pseudo full screen even if full screen API is available, default false
                    fullscreenElement: false // Dom element to render in full screen, false by default, fallback to map._container
                },
            });
        }else{
            let map = L.map("map", {
                zoomControl: true,
                fadeAnimation: true,
                markerZoomAnimation: true
            });
        }
        this.mapGlobal = map;

        map.setView([-2.1910846, -79.8844593], 14);
        this.layerGroup = L.layerGroup().addTo(map);

        var osm = L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            }
        ).addTo(map);

        if (this.visibleYesNoGoogle) {
            var roads = L.gridLayer.googleMutant({
                type: this.card.googleMapType, // valid values are 'roadmap', 'satellite', 'terrain' and 'hybrid'
            });
            this.baseLayers = {
                OpenStreetMap: osm,
                Google: roads,
            };
        } else {
            this.baseLayers = {
                OpenStreetMap: osm,
            };
        }

        let featureType = this.card.type;
        let popup = this.card.popup;
        let layerControl = L.control.layers(this.baseLayers, null, {
            position: "topright",
        });

        layerControl.addTo(map);

        var markers = L.markerClusterGroup({
            disableClusteringAtZoom: 11,
        });
        if( this.geoJsons.length > 1 ){
            var geo = L.geoJson(this.geoJsons, {
                onEachFeature: function (feature, layer) {
                    if (featureType == "LatLon") {
                        layer.bindPopup(feature.properties.popupContent);
                    } else if (featureType == "GeoJson") {
                        layer.bindPopup(feature.properties[popup]);
                    }
                },
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng);
                },
            });
            markers.addLayer(geo);
            layerGroup.addLayer(markers);
            //layerGroup.fitBounds(geo.getBounds());
        }
        
        setTimeout(() => {
            this.$nextTick(() => {
            });
        }, 5000);

        if (this.card.googleApiKey == null) {
            this.googleProviders = [];
        }
    },
    created() {
    }
};
</script>

<style>
.leaflet-control-layers-toggle {
    background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAQAAAADQ4RFAAACf0lEQVR4AY1UM3gkARTePdvdoTxXKc+qTl3aU5U6b2Kbkz3Gtq3Zw6ziLGNPzrYx7946Tr6/ee/XeCQ4D3ykPtL5tHno4n0d/h3+xfuWHGLX81cn7r0iTNzjr7LrlxCqPtkbTQEHeqOrTy4Yyt3VCi/IOB0v7rVC7q45Q3Gr5K6jt+3Gl5nCoDD4MtO+j96Wu8atmhGqcNGHObuf8OM/x3AMx38+4Z2sPqzCxRFK2aF2e5Jol56XTLyggAMTL56XOMoS1W4pOyjUcGGQdZxU6qRh7B9Zp+PfpOFlqt0zyDZckPi1ttmIp03jX8gyJ8a/PG2yutpS/Vol7peZIbZcKBAEEheEIAgFbDkz5H6Zrkm2hVWGiXKiF4Ycw0RWKdtC16Q7qe3X4iOMxruonzegJzWaXFrU9utOSsLUmrc0YjeWYjCW4PDMADElpJSSQ0vQvA1Tm6/JlKnqFs1EGyZiFCqnRZTEJJJiKRYzVYzJck2Rm6P4iH+cmSY0YzimYa8l0EtTODFWhcMIMVqdsI2uiTvKmTisIDHJ3od5GILVhBCarCfVRmo4uTjkhrhzkiBV7SsaqS+TzrzM1qpGGUFt28pIySQHR6h7F6KSwGWm97ay+Z+ZqMcEjEWebE7wxCSQwpkhJqoZA5ivCdZDjJepuJ9IQjGGUmuXJdBFUygxVqVsxFsLMbDe8ZbDYVCGKxs+W080max1hFCarCfV+C1KATwcnvE9gRRuMP2prdbWGowm1KB1y+zwMMENkM755cJ2yPDtqhTI6ED1M/82yIDtC/4j4BijjeObflpO9I9MwXTCsSX8jWAFeHr05WoLTJ5G8IQVS/7vwR6ohirYM7f6HzYpogfS3R2OAAAAAElFTkSuQmCC") !important;
}
.leaflet-popup-content-wrapper {
    border-radius: 1px;
}
.leaflet-top.leaflet-left .leaflet-control-zoom {
    box-shadow: 0 0 7px #999 !important;
}
#map {
    z-index: 0;
}
</style>
