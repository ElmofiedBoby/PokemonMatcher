import Pokedex from 'pokedex-promise-v2';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import multer from 'multer';
import fs from 'fs';

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
let profileType = null;

/* App Setup */
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('static'));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

/* App Endpoints */
app.use('/static', express.static(__dirname + '/public'));

app.get("/logout", (request,response) => {
	loggedin = false;
	username = null;
	let variables = {
		username: "no one",
		styleLoggedOut: "button-55",
		styleLoggedIn: "button-55-disabled"
	}
	response.render("index", variables);
});

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
		let result = await users.findOne({username: request.body.signin});
		if(result) {
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
	mongoclient.connect(async err => {
		let numOfAccounts = await users.count();
		let html = '';
		if(numOfAccounts == 0) {
			html = '<p>There are no accounts available to login as. Create one now!</p>';
		}
		else if(numOfAccounts == 1) {
			html = '<p>There is currently one account available to login as.</p>';
		}
		else {
			html = '<p>There are currently '+numOfAccounts+' accounts available to login as.</p>'
		}
		const variables = {
			profiles: html
		}

		response.render("createPokemon", variables);
	});
})

app.get("/viewProfile", (request, response) => {
	if (loggedin) {
		mongoclient.connect(async err => {
			let query  = await users.findOne({username: username});
			profileType = query.type;

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
});

var storage = multer.diskStorage({
	destination: 'static/pfp',
	filename: function(req, file, callback) {
	  callback(null, randomStr(26,'1234567890qwertyuiopasdfghjklzxcvbnm')+'.'+file.mimetype.split("/")[1]);
	}
});
app.post("/createPokemon", multer({storage: storage}).single("image"), (requests, response) => {

	username = requests.body.username;
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
				image: requests.file.path.substring(7),
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

app.get("/viewMatches", async (request, response) => {

	mongoclient.connect(async err => {
		let result = await users.findOne({username: username});
		let html = '<table id=\"pctable\">';
		for(var name in result.matches) {
			if(name != 0) {
				html += name % 6 === 0 ? '</tr><tr class="pcrow">' : '';
			}
			html += "<td class=\"pcentry\"><form method=\"POST\" action=\"/viewMatches\"><input type=\"text\" name=\"name\" class=\"name\" value=\""+result.matches[name][0]+"\" readonly><br><input type=\"image\" src=\""+result.matches[name][1]+"\" name=\"selectImage\" id=\"selectImage\"/></form></td>";
		}
		html += '</tr></table>';
		const variables = {
			portNumber: portNumber,
			Pictures: html
		}
		response.render("viewMatches", variables);
	});
	
});

app.post("/viewMatches", (request, response) => {
	mongoclient.connect(async err => {
		const pokemoninfo = await getPokemonInfo(request.body.name);
		let html = '<table id=\"matchAbilitiesTable\">';
		for(let i in pokemoninfo["abilities"]) {
			html += '<tr><td>'+pokemoninfo["abilities"][i]["ability"].name+'</td></tr>';
		}
		html += '</table>';
		
		let result = await users.findOne({username: username});
		let matchFound = false;
		for(let name in result.matches) {
			if(result.matches[name][0].localeCompare(request.body.name) == 0) {
				const variables = {
					NAME: request.body.name,
					Picture: pokemoninfo["sprites"].front_default,
					Type: pokemoninfo["types"][0]["type"].name,
					Gender: result.matches[name][2],
					Species: pokemoninfo["species"].name,
					Height: pokemoninfo["height"],
					Ability: html,
					backgroundInfo: await getMoveInfo(pokemoninfo, false)
				};
				response.render("viewMatchesProfile", variables);
				matchFound = true;
				await mongoclient.close();
				break;
			}
		}
		if(matchFound == false) {
			const variables = {
				NAME: request.body.name,
				Picture: pokemoninfo["sprites"].front_default,
				Type: pokemoninfo["types"][0]["type"].name,
				Gender: "n/a",
				Species: pokemoninfo["species"].name,
				Height: pokemoninfo["height"],
				Ability: html,
				backgroundInfo: "n/a"
			};
			response.render("viewMatchesProfile", variables);
			await mongoclient.close();
		}
	});
})

app.post("/match", (request, response) => {
	let gender = Math.floor(Math.random()*11) > 5 ? 'Male' : 'Female';
	mongoclient.connect(async err => {
		await users.findOneAndUpdate({
			username: username
		},
		{
			$push: {
				matches: [request.body.name, await getImage(request.body.name), gender]
			}
		});
	});
	response.redirect("/match");
})


/* Functions */
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

function getMoveInfo(pokemoninfo, short) {
	return P.getResource(pokemoninfo["abilities"][0]["ability"].url)
	.then((response) => {
		for(let name in response["effect_entries"]) {
			if(response["effect_entries"][name]["language"].name == "en") {
				if(short == true) {
					return response["effect_entries"][name].short_effect;
				}
				else {
					return response["effect_entries"][name].effect;
				}
			}
		}
		return "No available text in English.";
	});
}

function randomStr(len, arr) {
	var ans = '';
	for (var i = len; i > 0; i--) {
		ans += 
		  arr[Math.floor(Math.random() * arr.length)];
	}
	return ans;
}

function clearDB() {
	console.log("Clearing databases and profile pictures");
	mongoclient.connect(async err => {
		await users.deleteMany();
		await matches.deleteMany();
		await mongoclient.close();
	});
	fs.rmdir('static/pfp', {recursive:true, force:true}, (err) => {
		if(err) {
			return console.log("folder deletion error",err);
		}
		fs.mkdir('static/pfp', {}, (err) => {
			if(err) {
				return console.log("folder creation error",err);
			}
		});
	});
}


/* Server Console Logic */
var dataInput = '';
clearDB();
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
			clearDB();
		}
		else {
			console.log(`Invalid command: ${command}`);
		}
		process.stdout.write("^_^: ");
	}
});