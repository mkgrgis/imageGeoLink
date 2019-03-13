#!/bin/sh
NonGeo="";
GeoOk="";
while read s; do
	#if [ ! -f "$s" ]; then
	#	continue;
	#fi;	
	lat=$(exiftool -b -c "%.9f" -gpslatitude  "$s");
	lon=$(exiftool -b -c "%.9f" -gpslongitude "$s");
	comm=$(exiftool -b -UserComment "$s");
	if [ "$comm" == "" ]; then
		comm="$s";
	fi;
	if [ "$lat" == "" ] || [ "$lon" == "" ]; then
		NonGeo="$NonGeo"'<div><img class="photo" data-src="'"$s"'" alt="'"$comm"'"></div>'$'\n';
		echo -e "\e[31m\e[1G[✘]\e[39m $s φ'$lat' λ'$lon'" >&2;
 	else
		GeoOk="$GeoOk"'<div lat="'$lat'" lon="'$lon'"><img class="photo" data-src="'"$s"'" alt="'"$comm"'"></div>'$'\n';
		echo -e "\e[32m\e[1G[✔]\e[39m $s φ'$lat' λ'$lon' '$comm'" >&2;
    fi;
done;
