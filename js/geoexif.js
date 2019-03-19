/**
 * Заявки на использование внешних ресурсов
 * @param {*} code - код ресурса для диагностики
 * @param {*} URI - адрес ресурса
 * @param {*} retf - функция успешного завершения
 * @param {*} context - передаваемый связанный объект
 * @param {*} type - тип ресурса
 */
function IO_xhr(code, URI, retf, context, type = 'application/xml') {
	IO_xhr.status[code] = false;
	var req = new XMLHttpRequest();
	req.overrideMimeType(type);
	req._context = context;
	req._retf = retf;
	req._code = code;
	req.open('GET', URI, true);
	req.addEventListener('load', function (req) {
		var code = req.currentTarget._code;
		IO_xhr.status[code] = true;
		if (req.currentTarget.status != 200) {
			// обработать ошибку
			alert('' + '\n' + req.currentTarget.status + ': ' + req.currentTarget.statusText);
		} else {
			var c = req.currentTarget._context;
			console.log(code + " ✔")
			retf({
				req: req,
				context: c
			});
		}
	}
	);
	req.send(null);
}
IO_xhr.status = {};

/**
 * Выгрузка данных пользователю
 * @param {*} data - массив для выгрузки
 * @param {*} filename - предполагаемое название файла
 * @param {*} type - тип данных
 */
function IO_export(data, filename, type) {
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

/**
 * Разметка координат изображений
 * @param {*} photoDiv - область перечня изображений
 * @param {*} mapDiv_ - область карты
 * @param {array} imgURL_ - объект со списком файлов
 * @param {*} center - центр установки карты - ожидаемая область размещения изображений
 * @param {*} options - настройки
 */
function GeoExif(photoDiv, mapDiv_, imgURL_, center, options) {
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
	this.imgURL = imgURL_;
	this.photoDiv = photoDiv;
	this.currImg = {};
	this.geoMeta = []; // Массив по изображениям
	this.workMap.map.geoObj = this;
	this.workMap.map.on('click', this.SetImageMetaData);

	// Инициализация фотогруппы
	for (var i_URL in this.imgURL) {
		var n_el = this.imgURL[i_URL];
		if (!n_el)
			break;
		this.IniImg(n_el, i_URL);
	}
	photoDiv.scrollTo(0, 0);
}

// Добавление отдельного отображаемого изображения
GeoExif.prototype.IniImg = function (URL, i) {
	var d = document.createElement('div');
	var img = document.createElement('img');
	img.className = 'photo';
	img.geoObj = this;
	img.src__ = URL; img.src = 'null.png';
	img.geoMeta_i = i;
	this.geoMeta[i]= {URL :URL};
	console.log('exif -> ' + URL);
	var exif_obj = new Exif(URL, {
		ignored: [],
		base_image_obj: img,
		done: function (tags) {
			GeoExif.deposeExif(tags, this.options.base_image_obj);
			var a = this.options.base_image_obj.src__.split('/');
			console.log('exif: ' + a[a.length - 1]);
		}
	});
	img.onmouseover = GeoExif.LoadImage;
	img.onclick = function () {
		this.geoObj.currImg = this;
		GeoExif.DataFromImage(this);
	}
	d.appendChild(img);
	this.photoDiv.appendChild(d);
}

// Формирование координаты из массива
GeoExif.GPSCoordinat = function (a) {
	if (typeof a == 'undefined')
		return null;
	return a[0] + a[1] / 60.0 + a[2] / 3600.0;
}

// Размещение полученных координат
GeoExif.deposeExif = function (exif_obj, img) {
	function geoel(img, geo, lit, n) {
		var e = document.createElement('div');
		e.className = 'existgeo';
		e.innerText = lit + ':' + geo[n];
		img.parentNode.appendChild(e);
	}
	var geo = L.latLng(
		GeoExif.GPSCoordinat(exif_obj.GPSLatitude),
		GeoExif.GPSCoordinat(exif_obj.GPSLongitude)
	);
	if (geo.lat == null || geo.lng == null)
		return;
	var gm = img.geoObj.geoMeta[img.geoMeta_i];
	gm.geo = geo;
	gm.comment = exif_obj.UserComment ? GeoExif.decodeUTF8(exif_obj.UserComment) : null;
	gm.manual =  false;	
	geoel(img, geo, 'φ', 'lat');
	geoel(img, geo, 'λ', 'lng');
};

GeoExif.LoadImage = function (i) {
	function loaded() {
		if (this.src != this.src__) {
			var img = this;
			var a = img.src.split('/');
			console.log(a[a.length - 1]);
			this.onmouseover = null;
		}
	}
	img = i.originalTarget;
	if (img.src != img.src__) {
		img.addEventListener('load', loaded);
		img.src = img.src__;
		if (img.geoObj.geoMeta[img.geoMeta_i]) {
			GeoExif.DataFromImage(img);
		}
	}
}

// Данные выбранной картинки заполняют собой поля и устанавливают карту.
GeoExif.DataFromImage = function (i) {
	if (!i.geoObj)
		return;
	var go = i.geoObj;
	var imgGeoMeta = go.geoMeta[i.geoMeta_i];
	if (imgGeoMeta.comment)
		document.getElementById('comment').value = imgGeoMeta.comment;
	if (go.options && go.options.adrPan)
		go.options.adrPan.innerText = i.src;
	var geo = imgGeoMeta.geo;
	if (geo.lat && geo.lng && ! i.L_layer) {
		go.workMap.map.setView(geo);
		var m = new L.Marker(geo);
		m.bindPopup(' Exif ' + i.src);
		go.workMap.map.addLayer(m);
		i.L_layer = m;
	}
}

GeoExif.prototype.SetImageMetaData = function (e) {
	function insertAfter(elem, refElem) {
		return refElem.parentNode.insertBefore(elem, refElem.nextSibling);
	}
	var gi = this.geoObj.currImg;
	if (!gi)
		return;
	var cObj = {
		geo: e.latlng,
		comment: document.getElementById('comment').value,
		manual: true
	};
	this.geoObj.geoMeta[gi.geoMeta_i] = cObj;
	gi.setAttribute('alt', cObj.comment);
	var txtDiv = document.createElement('div');
	txtDiv.innerText = '⇑ ' + cObj.comment;
	insertAfter(txtDiv, gi);

	if (this.options.geoLog)
		this.options.geoLog(src + ' [φ: ' + cObj.geo.lat + ' λ:' + cObj.geo.lon + ' ] ' + '"' + cObj.comment + '" \n');


	if (gi.L_layer)
		this.removeLayer(gi.L_layer);
	var m = new L.Marker(cObj.geo);
	m.bindPopup(' Картинка ' + gi.src);
	gi.L_layer = m;
	this.addLayer(m);
	this.geoObj.currImg = null; // 	document.getElementById('comment').value = '✔';
	if (this.geoObj.options.adrPan)
		this.geoObj.options.adrPan.innerText = '✔';
}

GeoExif.prototype.exifSh = function () {
	var sh_text = '#!/bin/sh\n';
	for (var i in this.geoMeta) {
		var e = this.geoMeta[i];
		if (!e.manual)
			continue;		
		var com = 'exiftool −overwrite_original_in_place "' + e.URL + '" -XMP:GPSLongitude="' + e.geo.lng + '" -XMP:GPSLatitude="' + e.geo.lat + '" ' + (e.comment ? ' -UserComment="' + e.comment + '" ' : '') + ' -GPSMapDatum="WGS-84" -GPSVersionID="2.3.0.0";\n';
		sh_text += com;
	} // sh_text += '\n';	
	IO_export(sh_text, 'geofix.sh', 'application');
}

GeoExif.prototype.divHtmlGeoAlbum = function () {
	var html_text = '<!DOCTYPE html>\n<html>\n<head>\n<title>geoImg</title>\n</head>\n<body>';
	for (var i in this.geoMeta) {
		var e = this.geoMeta[i];		
		var exif = '<div coordinates="[ ' + e.geo.lng + ', ' + e.geo.lat + ' ]"><a href="' + e.URL + '"><img src="' + e.URL +'" ' + (e.comment ? + ' alt="' + e.comment + '" ' : '') + '></a></div>\n';
		html_text += exif;
	}
	html_text += '</body>\n</html>';
	IO_export(html_text, 'geofix.html', 'application/html');
}

GeoExif.prototype.OSM_data = function () {
	var bounds = this.workMap.map.getBounds();
	var adr = 'http://www.openstreetmap.org/api/0.6/map?bbox=' + bounds.toBBoxString();
	alert(adr);
	IO_xhr('OSMXML', adr, function (ret) {
		var XML = ret.req.currentTarget.responseXML;
		alert(JSON.stringify(XML));
	}, this, 'application/xml');



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
}

GeoExif.decodeUTF8 = function (data) {
	const extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
	var count = data.length;
	var str = "";

	for (var index = 0; index < count;) {
		var ch = data[index++];
		if (ch & 0x80) {
			var extra = extraByteMap[(ch >> 3) & 0x07];
			if (!(ch & 0x40) || !extra || ((index + extra) > count))
				return null;

			ch = ch & (0x3F >> extra);
			for (; extra > 0; extra -= 1) {
				var chx = data[index++];
				if ((chx & 0xC0) != 0x80)
					return null;

				ch = (ch << 6) | (chx & 0x3F);
			}
		}

		str += String.fromCharCode(ch);
	}

	return str;
}

