
var http = require("http");

function process_request(req, res) {
	var body = 'welcome!\n';
	var content_length = body.length;
	res.writeHead(200, {
		'Content_length': content_length,
		'Content_type': 'text/plain'
	});
	res.end(body);
}

var s = http.createServer(process_request);
s.listen(8080);
