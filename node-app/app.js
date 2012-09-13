var http         = require('http-get');
var Step         = require('step');
var xml2js       = require('xml2js');
var xml          = new xml2js.Parser();
var _            = require('underscore');
var AdmZip       = require('adm-zip');
var fs           = require('fs');
var rimraf       = require('rimraf');
var async        = require('async');



showMainMenu();

/*
getComicPages("b9296cd7-2189-4ae2-a89e-f12500778c25", function (err, res){
	console.log(res);
});


downloadComicPage( __dirname + '/comics' , "b9296cd7-2189-4ae2-a89e-f12500778c25", "e66dd276-c7e9-422a-8a06-0f70b61da473", "test.jpg", function (err, res){
	console.log(res);
});
*/


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
	var comicid;
	var foldername;

	Step(
		function () {
			console.log("");
			console.log("Enter comic id:");
			console.log("==================");
			ask(this);
		},

		function (err, res) {
			comicid = res;

			console.log("");
			console.log("Enter foldername:");
			console.log("==================");
			ask(this);
		},

		function (err, res) {
			foldername =  __dirname + '/' + res;

			fs.mkdir(foldername, this);
		},

		function (err) {
			console.log("Downloading into: " + foldername);
			downloadComic(foldername, comicid, this);
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

			comics = _.sortBy(comics, 'number');

			this();
		},

		function (err) {
			callback(err, comics);
		}
	);
}

function downloadComic (downloadfolder, comicid, callback) {
	Step(
		function () {
			getComicPages(comicid, this);
		},

		function (err, pages) {
			if(err) throw err;

			console.log("Downloading pages:");


			async.forEach(pages, function (page, forEachCallback){
				var filename = page.number;

				downloadComicPage(downloadfolder, comicid, page.id, filename, function (err, pagefile){
					if(err) forEachCallback(err);
					else{
						console.log("Downloaded " + pagefile);
						forEachCallback(null);
					}
				});
			}, this);
			
		},

		function (err) {
			callback(err);
		}

	);
}


function getComicPages (comicid, callback) {
	var pages = [];

	Step(
		function () {
			http.get({url: 'http://edge.adobe-dcfs.com/ddp/issueServer/issues/'+comicid+'/catalog/1'}, this);
		},

		function (err, res) {
			if(err) throw err;

			xml.parseString(res.buffer, this);
		},

		function (err, res) {
			if(err) throw err;

			var articles = res.results.issue[0].articles[0].article;

			for(var i=0; i<articles.length; i++){
				var article = articles[i];

				var page = {
					number: article.$.manifestXref,
					id: article.$.id
				}

				pages.push(page);
			}

			pages = _.sortBy(pages, 'number');

			this();
		},

		function (err) {
			callback(err, pages);
		}
	);
}


function downloadComicPage (destination, comicid, comicpageid, filename, callback) {
	var tempzip = destination + '/temp' + comicpageid + '.zip';
	var pagefile = destination + '/' + filename;
	var tempfolder =  destination + '/temp' + comicpageid;

	var extension;

	Step(
		function () {
			http.get({url: 'http://edge.adobe-dcfs.com/ddp/issueServer/issues/'+comicid+'/articles/'+comicpageid+'/1'}, tempzip, this);
		},

		function (err, res) {
			if(err) throw err;

			var zipEntryName;

			try{
				var zip = new AdmZip(tempzip);
				var zipEntries = zip.getEntries();

				for(var i=0; i<zipEntries.length; i++){
					if(zipEntries[i].entryName == "StackResources/asset_L1.jpg"){
						zipEntryName = "StackResources/asset_L1.jpg";
						extension = ".jpg";
					}else if(zipEntries[i].entryName == "StackResources/asset_L1.png"){
						zipEntryName = "StackResources/asset_L1.png";
						extension = ".png";
					}
				}

				zip.extractEntryTo(zipEntryName, tempfolder, true);

			}catch(exception){
				//console.log(exception);
			}

			fs.rename(tempfolder + '/' + zipEntryName, pagefile + extension, this);
		},

		function (err) {
			if(err) throw err;

			fs.unlink(tempzip, this);
		},

		function (err) {
			if(err) throw err;

			rimraf(tempfolder, this);
		},

		function (err) {
			callback(err, pagefile + extension);
		}

	);
}

