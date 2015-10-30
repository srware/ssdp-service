/*
* SSDP Service
*
* Written by Scott Ware
*/

var os = require("os");
var ssdp = require('ssdp')
var dbus = require('dbus-native');
var cbus = dbus.systemBus();
var sbus = ssdp()
var fs = require('fs');

var name="intel-iot-device";
var manufacturer="Intel";
var manufacturerUrl="http://www.intel.com/content/www/us/en/homepage.html";
var model="Intel IoT Device";
var modelUrl="http://www.intel.co.uk/content/www/uk/en/internet-of-things/overview.html";
var version="1.0.0";
var serial="12345678";

var PORT = 8080;
var edisonSerialPath = "/factory/serial_number"
var defaultSerialPath = "/sys/class/dmi/id/board_serial"
var buildInfoPath = "/etc/build-info"
var namePath = "/etc/hostname"

// Exit cleanly when executed using systemd
process.on('SIGTERM', function() {
    	console.log('Stopping service.')
    	sbus.stop(function (error) {
    		process.exit(error ? 1 : 0)
  	})
});

process.on('SIGINT', function() {
    	console.log('Stopping service.')
    	sbus.stop(function (error) {
    		process.exit(error ? 1 : 0)
  	})
});

// Checks connection state using Connman
var checkState = function (callback) {
	var online = null;

    	cbus.invoke({
        	destination: 'net.connman',
        	path: '/',
        	'interface': 'net.connman.Manager',
        	member: 'GetProperties',
        	type: dbus.messageType.methodCall,
    	}, function(error, response) {
        	if (error) {
        		console.error('Connman Error!', error);
	    		online = false;
        	} else {
	    		if(response[0][1][1] != 'online') {
				online = false;
			} else {
				online = true;
			}
        	}
		
		callback(online);
    	});
}

var pollState = function () {
	checkState(function(result) {
		if(result == false) {
			sbus.stop(function (error) {
    				process.exit(error ? 1 : 0)
			})
		}
	});

	setTimeout(pollState,10000);
}

//
// Populate device information if available
//

// Check for Edison serial
if(fs.existsSync(edisonSerialPath)) {
	try {
		data = fs.readFileSync(edisonSerialPath);
		serial = data.toString();
	} catch (err) {
		console.log("Failed to read Edison serial file!")
	}
}
// Use Board Serial
else if(fs.existsSync(defaultSerialPath)) {
	try {
		data = fs.readFileSync(defaultSerialPath);
		serial = data.toString();
	} catch (err) {
		console.log("Failed to read board serial file!")
	}
}

// Get name
if(fs.existsSync(namePath)) {
	try {
		data = fs.readFileSync(namePath);
		name = data.toString();
	} catch (err) {
		console.log("Failed to read name file!")
	}
}

// Get build info
if(fs.existsSync(buildInfoPath)) {
	try {
		data = fs.readFileSync(buildInfoPath);

		buildInfo = data.toString().split("\n");
		for(i in buildInfo) {
			if(buildInfo[i].indexOf("MANUFACTURER=") > -1) {
				manufacturer = buildInfo[i].split("=")[1];
			} else if(buildInfo[i].indexOf("MANUFACTURER_URL=") > -1) {
				manufacturerUrl = buildInfo[i].split("=")[1];
			} else if(buildInfo[i].indexOf("MODEL=") > -1) {
				model = buildInfo[i].split("=")[1];
			} else if(buildInfo[i].indexOf("MODEL_URL=") > -1) {
				modelUrl = buildInfo[i].split("=")[1];
			} else if(buildInfo[i].indexOf("VERSION=") > -1) {
				version = buildInfo[i].split("=")[1];
			}
		}
	} catch (err) {
		console.log("Failed to read device info file!")
	}
}

//
// Service Begin
//

// Check connection status and start SSDP if connected
checkState(function(result) {
	if(result == false) {
		console.log('Network not connected... Exiting!');
		process.exit(0);
	} else {
		// Print error messages to the console
		sbus.on('error', console.error)

		console.log("Start advertising device")

		// Advertise device
		sbus.advertise({
			usn: 'upnp:rootdevice',
			interval: 10000,
		  	details: function (callback) {
		    		callback(null, {
		      			'$': {
						'xmlns': 'urn:schemas-upnp-org:device-1-0',
						'configId': '1'
		      			},
		      			'specVersion': {
						'major': '1',
						'minor': '1'
		      			},
		      			'device': {
						'deviceType': 'urn:schemas-upnp-org:device:Basic:1',
						'productName':'Intel IoT Reference Platform',
						'friendlyName': name,
						'manufacturer': manufacturer,
						'manufacturerURL': manufacturerUrl,
						'modelDescription': '',
						'modelName': model,
						'modelNumber': version,
						'modelURL': modelUrl,
						'serialNumber': serial,
						'UDN': sbus.options.udn,
						'presentationURL': ''
		      			}
				})
			}
		})

		// Start polling connection
		pollState()
	}
});
