var http         = require('http-get');
var Step         = require('step');
var xml2js       = require('xml2js');
var xml          = new xml2js.Parser();

showMainMenu();

function ask(callback) {
	var stdin = process.stdin;

	stdin.resume();

	stdin.once('data', function(data) {
		data = data.toString().trim();
		callback(null, data);
	});
}

function showMainMenu () {
	Step(
		function () {
			console.log("");
			console.log("Choose an option:");
			console.log("1. List comics");
			console.log("2. Download comic");
			console.log("==================");
			ask(this);
		},

		function (err, res) {
			switch(res){
				case "1":
					listComics();
					break;
				case "2":
					showDownloadComicMenu();
					break;
				default:
					showMainMenu();
					break;
			}
		}

	);
}


function listComics () {
	Step(
		function () {
			getComics(this);
		},

		function (err, comics) {
			if(err) console.log(err.stack);
			else{
				comics.forEach(function(comic){
					console.log(comic.id + " , " + comic.number + " , " + comic.title);
				});
			}
			showMainMenu();
		}
	);
}

function showDownloadComicMenu () {
	Step(
		function () {
			console.log("");
			console.log("Enter comic id:");
			console.log("==================");
			ask(this);
		},

		function (err, res) {
			downloadComic(res, this);
		},

		function (err, res) {
			if(err) console.log(err.stack);
			showMainMenu();
		}
	);
}



function getComics (callback){
	var comics = [];

	Step(
		function () {
			http.get({url: 'http://edge.adobe-dcfs.com/ddp/issueServer/issues?accountId=6e2e4d58d4b44bdd92e80415b7a58473'}, this);
		},

		function (err, res) {
			if(err) throw err;

			xml.parseString(res.buffer, this);
		},

		function (err, res) {
			if(err) throw err;

			var issues = res.results.issues[0].issue;
			
			for(var i=0; i < issues.length; i++){
				var issue = issues[i];


				var comic = {
					id: issue.$.id,
					number: issue.issueNumber,
					title: issue.description
				}

				comics.push(comic);
			}

			this();
		},

		function (err) {
			callback(err, comics);
		}
	);
}

function downloadComic (comicid, callback) {
	callback();
}

