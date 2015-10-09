/*
* SSDP Service
*
* Written by Scott Ware
*/

var os = require("os");
var ssdp = require('@achingbrain/ssdp')
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
var deviceInfoPath = "/etc/device-info"
var versionPath = "/etc/version"
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
var checkState = function () {
    	cbus.invoke({
        	destination: 'net.connman',
        	path: '/',
        	'interface': 'net.connman.Manager',
        	member: 'GetProperties',
        	type: dbus.messageType.methodCall,
    	}, function(error, response) {
        	if (error) {
        		console.error('Connman Error!', error);
	    		sbus.stop(function (error) {
    				process.exit(error ? 1 : 0)
  			})
        	} else {
	    		if(response[0][1][1] != 'online') {
				console.info('Network not connected, exiting!')
				sbus.stop(function (error) {
    					process.exit(error ? 1 : 0)
  				})
	    		}
        	}
    	});

    	setTimeout(checkState,10000);
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

// Get version
if(fs.existsSync(versionPath)) {
	try {
		data = fs.readFileSync(versionPath);
		version = data.toString();
	} catch (err) {
		console.log("Failed to read version file!")
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

// Get device info
if(fs.existsSync(deviceInfoPath)) {
	try {
		data = fs.readFileSync(deviceInfoPath);

		deviceInfo = data.toString().split("\n");
		for(i in deviceInfo) {
			if(deviceInfo[i].indexOf("Manufacturer=") > -1) {
				manufacturer = deviceInfo[i].split("=")[1];
			} else if(deviceInfo[i].indexOf("ManufacturerUrl=") > -1) {
				manufacturerUrl = deviceInfo[i].split("=")[1];
			} else if(deviceInfo[i].indexOf("Model=") > -1) {
				model = deviceInfo[i].split("=")[1];
			} else if(deviceInfo[i].indexOf("ModelUrl=") > -1) {
				modelUrl = deviceInfo[i].split("=")[1];
			}
		}
	} catch (err) {
		console.log("Failed to read device info file!")
	}
}

//
// Start server
//

// Print error messages to the console
sbus.on('error', console.error)

// Start polling connection
checkState()

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
