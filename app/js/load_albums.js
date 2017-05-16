var http = require('http'),
	fs = require('fs');

function list_albums(callback) {
	fs.readdir(
		"albums/",
		function (err, files) {
			if (err) {
				callback(make_error("file error", JSON.stringify(err)));
				return;
			}

			var dirs  = [];
				    (function iterator(index) {
				    	if (index == files.length) {
				    		callback(null, dirs);
				    		return;
				    	}
					fs.stat(
						"albums/" + files[index],
						function (err, stats) {
							if (err) {
								callback(make_error("file error",
													JSON.stringify(err)));
							return;
			       			}
							if (stats.isDirectory()) {
								var obj = { name: files[index] };
								dirs.push(obj);
							}
							iterator(index + 1)
						}
					);
			    })(0);			
		}

	);
}

function load_album(album_name, callback) {
	fs.readdir(
		"albums/" + album_name,
		function (err, files) {
			if (err) {
				if (err.code == "ENOENT") {
					callback(no_such_album());
				} else {
					callback(make_error("file_error",
										JSON.stringify(err)));
				}
				return;
			}

			var pictures = [];
			var path = "albums/" + album_name + "/";

			(function iterator(index) {
				if (index == files.length) {
					var obj = { short_name: album_name,
								photos: pictures };
					callback(null, obj);
					return;
				}

				fs.stat(
					path + files[index],

					function (err, stats) {
						if (err) {
							callback(make_error("file error",
												JSON.stringify(err)));
						return;
			       		}
			       		if (stats.isFile()) {
			       			var obj = { filename: files[index],
			       						desc: files[index] };
			       			pictures.push(obj);
			       		}
			       		iterator(index + 1)
			       	}

				);
			})(0);
		}	
	);
}


function process_request(req, res) {
	console.log("INCOMING REQUEST: " + req.method + " " + req.url);
	if (req.url == '/albums.json') {
		get_list_albums(req, res);		
	} else if (req.url.substr(0, 7) == '/albums'
				&& req.url.substr(req.url.length - 5) == '.json') {
		get_album(req, res);
	} else {
		send_failure(res, 404, invalid_resource());
	}
}

function get_list_albums(req, res) {
	list_albums(function (err, albums) {
		if (err) {
			send_failure(res, 500, err);
			return;
		}

		send_success(res, { albums: albums });
	});

}

function get_album(req, res) {
	// /albums/album_name.json
	var album_name = req.url.substr(7, req.url.length - 12);
	load_album(album_name,
				function (err, album_contents) {
					if (err && err.error == "no_such_album") {
						send_failure(res, 404, err);						
					} else if (err) {
						send_failure(res, 500, err);						
					} else {
						send_success(res, { album_data: album_contents });
					}
				}
	);
}

function make_error(err, msg) {
	var e = new Error(msg);
	e.code = err;
	return e;
}

function send_success(res, data) {
	res.writeHead(200, {"Content-Type": "application/json"});
	var output = { error: null, data: data };
	res.end(JSON.stringify(output) + "\n");
}

function send_failure(res, code, err) {
	var code = code;
	res.writeHead(code, { "Content-Type" : "application/json" });
	res.end(JSON.stringify({ error: code, message: err.message }) + "\n");
}

function invalid_resource() {
	return make_error("invalid_resource",
						"The requested resource does not exist.");
}

function no_such_album() {
	return make_error("no_such_album",
						"The requested resource does not exist.");
}



var s = http.createServer(process_request);
s.listen(8080);





