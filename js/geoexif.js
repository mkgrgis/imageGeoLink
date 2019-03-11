/**
* Представляет карту, действующую в блоке
* @constructor
* @param {div} div - Блок для размещенеия карты.
* @param {LonLat} centerGeo - Координаты центра карты.
* @param {int} zoom - Условный масштаб.
* @param {int} minZ - мимнимальный условный масштаб.
* @param {int} maxZ - максимальный условный масштаб.
* @param {bool} controls - включать ли преключатель своёв.
*/
function mapDiv(div, centerGeo, provider, providerName, Z, controls) {
	this.div = div;
	this.map = L.map(div.getAttribute('id'), { keyboard: false });
	if (!isNaN(centerGeo[0]) && !isNaN(centerGeo[1]) && !isNaN(Z.ini))
		this.map.setView(centerGeo, Z.ini);
	else
		console.warn('map center ?');
	if (Z) {
		this.map.setMinZoom(Z.min);
		this.map.setMaxZoom(Z.max);
	}
	var a = Array.isArray(provider);
	var prov0 = (a ? provider[0] : provider);
	this.ini_layer = (typeof prov0 === 'string') ? L.tileLayer.provider(prov0) : prov0;
	this.ini_layer.addTo(this.map);
	if (controls) {
		this.Control = new L.Control.Layers();
		var n0 = providerName ? (Array.isArray(providerName) ? providerName[0] : providerName) : ((typeof prov0 === 'string') ? prov0 : '?');
		this.Control.addBaseLayer(this.ini_layer, n0);
		if (a) {
			for (var i in provider) {
				if (i != 0) {
					var prov = provider[i];
					var provStr = providerName[i] ? providerName[i] : ((typeof prov === 'string') ? prov : '?');
					this.Control.addBaseLayer((typeof prov === 'string') ? L.tileLayer.provider(prov) : prov, provStr);
				}
			}
		}
		this.map.addControl(this.Control);
	}
}

function GeoExif(photoDiv, mapDiv_, files, center, options) {
	this.options = options;
	// Инициализация карты
	this.center0 = center;
	this.workMap = new mapDiv(
		mapDiv_,
		center,
		this.options.mapProvider ? this.options.mapProvider : 'OpenStreetMap.Mapnik',
		this.options.mapName ? this.options.mapName : 'ОСМ/Мапник',
		this.options.mapZ ? this.options.mapZ : { ini: 10, min: 1, max: 21 },
		true
	);
	this.geoimg = {};
	this.result = [];
	this.workMap.map.geoexif = this;
	this.workMap.map.on('click', this.SetTag);

	function deposeExif() {
		function dec(a) {
			return a[0] + a[1] / 60.0 + a[2] / 3600.0;
		}
		var a = img.src.split('/');
		console.log( 'ok' + a[a.length-1]);
		this.EXIF_obj = EXIF.getAllTags(this);
		var pp = document.createElement('div');
		pp.className = 'existgeo';
		var pl = document.createElement('div');
		pl.className = 'existgeo';
		var lat = dec(this.EXIF_obj.GPSLatitude);
		var lon = dec(this.EXIF_obj.GPSLongitude);
		pp.innerText = 'φ:' + lat;
		pl.innerText = 'λ:' + lon;
		if (this.EXIF_obj.UserComment)
			this.alt = this.EXIF_obj.UserComment;
		this.lat = lat;
		this.lon = lon;
		this.parentNode.appendChild(pp);
		this.parentNode.appendChild(pl);
	};
	function loaded() {
		var img = this;
		var a = img.src.split('/');
		console.log(a[a.length-1]);

	}

	// Инициализация фотогруппы
	this.file_addr = files.replace('\r','').split('\n'); // JSON.stringify(allMetaData, null, "\t");
	for (var i_fa in this.file_addr) {
		var d = document.createElement('div');
		var i = document.createElement('img');
		i.className = 'photo';
		i.src__ = this.file_addr[i_fa];

var exif = new Exif(i.src__[0]=='/' ? 'file://' + i.src__ : i.src__, {
  done: function(tags) {
    console.log(tags);
  }
});

//		EXIF.getData(blob, deposeExif);
		i.src = 'null.png';
		
		i.geoExif = this;
		i.index_file_el = i_fa;
		i.onmouseover = function () {
			if (this.src != this.src__){
				this.addEventListener('load', loaded);
				this.src = this.src__;
			}
		}
		i.onclick = function () {
			this.geoExif.geoimg = this;
			if (this.geoExif.options.adrPan)
				this.geoExif.options.adrPan.innerText = this.src;
			if (this.lon && this.lat) {
				this.geoExif.workMap.map.setView([this.lat, this.lon]);
				var m = new L.Marker([this.lat, this.lon]);
				m.bindPopup(' Exif ' + this.src);
				this.geoExif.workMap.map.addLayer(m);
				this.L_layer = m;
			}
		}
		d.appendChild(i);
		photoDiv.appendChild(d);
	}
	photoDiv.scrollTo(0, 0);
}

GeoExif.prototype.SetTag = function (e) {
	var geoimg = this.geoexif.geoimg;
	if (!geoimg)
		return;
	var ge = this.geoexif;
	var lat = e.latlng.lat;
	var lon = e.latlng.lng;
	var src = geoimg.getAttribute('src');

	var comm = document.getElementById('comment').value;
	geoimg.setAttribute('alt', comm);
	var commentDiv = document.createElement('div');
	commentDiv.innerText = '⇑ ' + comm;

	function insertAfter(elem, refElem) {
		return refElem.parentNode.insertBefore(elem, refElem.nextSibling);
	}

	insertAfter(commentDiv, geoimg);
	if (ge.options.geoLog)
		ge.options.geoLog(src + ' [φ: ' + lat + ' λ:' + lon + ' ] ' + '"' + comm + '" \n');
	ge.result[geoimg.index_file_el] = {
		index_file_el: geoimg.index_file_el,
		lat: lat,
		lon: lon,
		comment: comm
	};
	geoimg.geoParam = ge.result[geoimg.index_file_el];
	var m = new L.Marker([lat, lon]);
	m.bindPopup(' Картинка ' + src);
	if (geoimg.L_layer)
		ge.workMap.map.removeLayer(geoimg.L_layer);
	geoimg.L_layer = m;
	ge.workMap.map.addLayer(m);
	ge.geoimg = null;
	document.getElementById('comment').value = '';
	if (ge.options.adrPan)
		ge.options.adrPan.innerText = '';
}
/*
http://overpass.osm.rambler.ru/cgi/interpreter?data=[out:json];way[name%3D%22Gielgenstra%C3%9Fe%22]%2850.7%2C7.1%2C50.8%2C7.25%29%3Bout%3B
(
  way
    
	(59.695, 30.4621,59.6955, 30.4622);
  >;
);
out;
	
(node(59.695, 30.4621,59.6955, 30.4625);<;);out; 
*/

function download(data, filename, type) {
	var file = new Blob([data], { type: type });

	var a = document.createElement("a"),
		url = URL.createObjectURL(file);
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	setTimeout(function () {
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}, 0);
}

GeoExif.prototype.exifSh = function () {
	var sh_text = '#!/bin/sh\n';
	for (var i in this.result) {
		var e = this.result[i];
		var exif = 'exiftool −overwrite_original_in_place -GPSLongitude="' + e.lon + '" -GPSLatitude="' + e.lat + (e.comment ? '" -UserComment="' + e.comment + '" ' : '" ') + '"' + this.file_addr[e.index_file_el] + '";\n';
		sh_text += exif;
	} // sh_text += '\n';	
	download(sh_text, 'geofix.sh', 'application');
}

GeoExif.prototype.OSM_data = function () {
	var bounds = workMap.getBounds();
	var x = 'http://www.openstreetmap.org/api/0.6/map?bbox=' + bounds.toBBoxString();
	//.getSouth() + ',' + bounds.getWest() + ',' + bounds.getNorth() + ',' + bounds.getEast() + ''
	// http://www.openstreetmap.org/api/0.6/map?bbox=30.453543663024906,59.694972268396796,30.479078292846683,59.69982268815299
	alert(x);
}
