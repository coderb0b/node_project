var http = require('http'),
	fs = require('fs'),
	url = require('url');

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

function load_album(album_name, page, page_size, callback) {
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
					var paginate;
					// slice picture count according to params
					paginate = pictures.splice(page * page_size, page_size);

					var obj = { short_name: album_name,
								photos: paginate };
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

	req.parsed_url = url.parse(req.url, true);
	var core_url = req.parsed_url.pathname;
	console.log(core_url);
	console.log(req.parsed_url);

	if (core_url == '/albums.json') {
		get_list_albums(req, res);		
	} else if (core_url.substr(0, 7) == '/albums'
				&& core_url.substr(core_url.length - 5) == '.json') {
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

	var get_params = req.parsed_url.query;
	var page_num = get_params.page ? get_params.page : 0;
	var page_size = get_params.page_size ? get_params.page_size : 1000;

	if (isNaN(parseInt(page_num))) page_num = 0;
	if (isNaN(parseInt(page_size))) page_size = 1000;

	// /albums/album_name.json
	var core_url = req.parsed_url.pathname;

	var album_name = core_url.substr(7, core_url.length - 12);
	load_album(album_name,
				page_num,
				page_size,
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





