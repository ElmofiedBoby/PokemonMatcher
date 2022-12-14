import Pokedex from 'pokedex-promise-v2';
import express, { response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import multer from 'multer';

//require('alert');
/* Port Arguments */
if (process.argv.length !== 3) {
	console.log(">:(\nUsage: pokemonFinderServer.js portNumber");
	process.exit(1);
}
else {
	var portNumber = process.argv[2];
}

/* Basic Setup */
const __dirname = path.resolve(path.dirname(''));
dotenv.config({ path: path.resolve(__dirname, '.env') });
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, user_collection: process.env.MONGO_COLLECTION_USERS, matches_collection: process.env.MONGO_COLLECTION_MATCHES };
const uri = `mongodb+srv://${userName}:${password}@cluster0.l9m35rn.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;
const mongoclient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const users = mongoclient.db(databaseAndCollection.db).collection(databaseAndCollection.user_collection);
const matches = mongoclient.db(databaseAndCollection.db).collection(databaseAndCollection.matches_collection);
const P = new Pokedex();

let loggedin = false;
let username = null;
let nameOfUser;

/* App Setup */
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('static'));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

/* App Endpoints */
app.use('/static', express.static(__dirname + '/public'));

app.get("/", (request, response) => {
	if(username == null) {
		let variables = {
			username: "no one",
			styleLoggedOut: "button-55",
			styleLoggedIn: "button-55-disabled"
		}
		response.render("index", variables);
	}
	else {
		let variables = {
			username: username,
			styleLoggedOut: "button-55-disabled",
			styleLoggedIn: "button-55"
		}
		response.render("index", variables);
	}
});

app.post("/signin", (request, response) => {
	mongoclient.connect(async err => {
		console.log(request.body.signin);
		let result = await users.findOne({username: request.body.signin});
		if(result) {
			console.log("User exists!");
			loggedin = true;
			username = request.body.signin;
			const variables = {
				username: username,
				styleLoggedOut: "button-55-disabled",
				styleLoggedIn: "button-55"
			}
			response.render("index", variables);
		}
		else {
			console.log("User does not exist!");
			loggedin = false;
			username = null;
			const variables = {
				username: "no one",
				styleLoggedOut: "button-55",
				styleLoggedIn: "button-55-disabled"
			}
			response.render("index", variables);
		}
		await mongoclient.close();
	})

})

app.get("/createPokemon", (request, response) => {
	response.render("createPokemon");
})

app.get("/viewProfile", (request, response) => {
	if (loggedin) {
		mongoclient.connect(async err => {
			let query  = await users.findOne({username: username});

			const variables = {
				image: query.image,
				username: (query) ? query.username : "NONE",
				name: (query) ? query.name : "NONE",
				type: (query) ? query.type : "NONE",
				height: (query) ? query.height : "NONE",
				ability:(query) ? query.ability : "NONE",
				bginfo: (query) ? query.bginfo : "NONE"
			}
			response.render("viewProfile", variables);
			await mongoclient.close();
		});
	}
	else {
		console.log("Please create a profile first.");
		const variables = {
			username: "no one",
			styleLoggedOut: "button-55",
			styleLoggedIn: "button-55-disabled"
		}
		response.render("index", variables);
	}
})

function randomStr(len, arr) {
	var ans = '';
	for (var i = len; i > 0; i--) {
		ans += 
		  arr[Math.floor(Math.random() * arr.length)];
	}
	return ans;
}

var storage = multer.diskStorage({
	destination: 'static/pfp',
	filename: function(req, file, callback) {
	  callback(null, randomStr(26,'1234567890qwertyuiopasdfghjklzxcvbnm')+'.'+file.mimetype.split("/")[1]);
	}
});

app.post("/createPokemon", multer({storage: storage}).single("image"), (requests, response) => {

	username = requests.body.username;
	nameOfUser = requests.body.username;
	loggedin = true;

	async function insertOnlyIfNonExistent() {
		let result = await users.findOne({
			username: requests.body.username
		});
		if(result) {
			console.log("ERROR: User already exists!");
		}
		else {
			await users.insertOne({
				image: requests.file.filename,
				username: requests.body.username,
				name: requests.body.name,
				type: requests.body.type,
				height: requests.body.height,
				ability: requests.body.ability,
				bginfo: requests.body.bginfo,
				matches: []
			});
		}
		await mongoclient.close();
	}
	mongoclient.connect(insertOnlyIfNonExistent);
	const variables = {
		username: username,
		styleLoggedOut: "button-55-disabled",
		styleLoggedIn: "button-55"
	}
	response.render("index", variables);
})

app.get("/match", (request, response) => {
	P.getPokemonByName(Math.floor(Math.random() * 906)) // with Promise
		.then((webresponse) => {
			const variables = {
				portNumber: portNumber,
				NAME: webresponse["forms"][0].name,
				Picture: webresponse["sprites"].front_default
			}
			response.render("match", variables);

		})
		.catch((error) => {
			console.log('There was an ERROR: ', error);
		});
});

function appendPng() {

}

function getImage(name) {
	return P.getPokemonByName(name) // with Promise
		.then((webresponse) => {
			return webresponse["sprites"].front_default;
		})
		.catch((error) => {
			console.log('There was an ERROR: ', error);
		});
}

function getPokemonInfo(name) {
	return P.getPokemonByName(name) // with Promise
		.then((webresponse) => {
			return webresponse;
		})
		.catch((error) => {
			console.log('There was an ERROR: ', error);
			return error;
		});
}

app.get("/viewMatches", async (request, response) => {
	/*
	async function main() {
		try {
			await mongoclient.connect();
			let filter = {};
			const cursor = mongoclient.db(databaseAndCollection.db)
			.collection(databaseAndCollection.matches_collection)
			.find(filter);
			
			return await cursor.toArray();
		} catch (e) {
			console.error(e);
		} finally {
			await mongoclient.close();
		}
	}
	*/
	mongoclient.connect(async err => {
		let result = await users.findOne({username: username});
		let html = '<table id=\"pctable\">';
		for(var name in result.matches) {
			if(name != 0) {
				html += name % 6 === 0 ? '</tr><tr class="pcrow">' : '';
			}
			//html += "<td class=\"pcentry\">"+result.matches[name]+"<br><img src=\""+await getImage(result.matches[name])+"\"></td>";
			html += "<td class=\"pcentry\"><form method=\"POST\" action=\"/viewMatches\"><input type=\"text\" name=\"name\" value=\""+result.matches[name]+"\" readonly><br><input type=\"image\" src=\""+await getImage(result.matches[name])+"\" name=\"selectImage\" id=\"selectImage\"/></form></td>";
		}
		html += '</tr></table>';
		const variables = {
			portNumber: portNumber,
			Pictures: html
		}
		response.render("viewMatches", variables);
	});
	/*
	let result = await main().catch(console.error);
	console.log("Picture");
	console.log(await getImage("seaking"));
	let link = await getImage("seaking");
	let str="";
	for(const property in result){
		str = str + property.name + "<br><img + src=" + await getImage(property.name) +  "><br>";
	}
	//str = result.map(u => u.name + "<br><img + src=" + await getImage(u.name) +  "><br>").join("");
	const variables = {
		portNumber: portNumber,
		Pictures: "<img + src=" + link +  ">"
	}
	response.render("viewMatches", variables);
	*/
	
});

app.post("/viewMatches", (request, response) => {

	async function getInfo() {
		const pokemoninfo = await getPokemonInfo(request.body.name);
		let html = '<ol>';
		for(let i in pokemoninfo["abilities"]) {
			html += '<li>'+pokemoninfo["abilities"][i]["ability"].name+'</li>';
		}
		html += '</ol>';
		const variables = {
			NAME: request.body.name,
			Picture: pokemoninfo["sprites"].front_default,
			Type: pokemoninfo["types"][0]["type"].name,
			Gender: Math.floor(Math.random()*11) > 5 ? 'Male' : 'Female',
			Species: pokemoninfo["species"].name,
			Height: pokemoninfo["height"],
			Ability: html,
			backgroundInfo: "n/a"
		}
		response.render("viewMatchesProfile", variables);
	}
	getInfo();
})

app.post("/match", (request, response) => {
	mongoclient.connect(async err => {
		//await users.insertOne({
		//	name: request.body.name
		//});
		await users.findOneAndUpdate({
			username: username
		},
		{
			$push: {
				matches: request.body.name
			}
		});
		await mongoclient.close();
	});
	response.redirect("/match");
})


/* Functions */
function getProfile() {
	mongoclient.db.getCollection();
}

/* Server Console Logic */
var dataInput = '';
app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdin.setEncoding("utf8");
process.stdout.write("^_^: ")
process.stdin.on('readable', () => {
	while ((dataInput = process.stdin.read()) !== null) {
		let command = dataInput.trim();
		if (command === "stop") {
			console.log("Shutting down the server");
			process.exit(0);
		}
		else if(command == "clear") {
			console.log("Clearing databases");
			mongoclient.connect(async err => {
				await users.deleteMany();
				await matches.deleteMany();
				await mongoclient.close();
			});
		}
		else if(command =="test") {
			async function getInfo() {
				const pokemoninfo = await getPokemonInfo("pikachu");
				const abilities = pokemoninfo["abilities"];
				let html = '';
				for(let i in pokemoninfo["abilities"]) {
					console.log(i);
					console.log(pokemoninfo["abilities"][i]["ability"].name + " - " + pokemoninfo["abilities"][i]["ability"].url);
				}
				const variables = {
					NAME: "pikachu",
					Picture: await getImage("pikachu"),
					Type: pokemoninfo["types"][0]["type"].name,
					Gender: Math.floor(Math.random()*11) > 5 ? 'Male' : 'Female',
					Species: pokemoninfo["species"].name,
					Height: pokemoninfo["height"],
					Ability: pokemoninfo["abilities"],
					backgroundInfo: null
				}
				//console.log(abilities[0]["ability"].name);
			}
			console.log("testing with: pikachu");
			getInfo();
		}
		else {
			console.log(`Invalid command: ${command}`);
		}
		process.stdout.write("^_^: ");
	}
});