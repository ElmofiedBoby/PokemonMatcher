import Pokedex from 'pokedex-promise-v2';
import express, { response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

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
	response.render("index");
});

app.get("/createPokemon", (request, response) => {
	response.render("createPokemon");
})

app.get("/viewProfile", (request, response) => {
	if (loggedin) {
		mongoclient.connect(async err => {
			let query  = await users.findOne({username: nameOfUser});

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
		response.redirect("/");
	}
})

app.post("/createPokemon", (requests, response) => {
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
				image: requests.body.image,
				username: requests.body.username,
				name: requests.body.name,
				type: requests.body.type,
				height: requests.body.height,
				ability: requests.body.ability,
				bginfo: requests.body.bginfo
			});
		}
		await mongoclient.close();
	}
	mongoclient.connect(insertOnlyIfNonExistent);
	response.redirect("/");
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

function getImage(name) {
	return P.getPokemonByName(name) // with Promise
		.then((webresponse) => {
			return webresponse["sprites"].front_default;
		})
		.catch((error) => {
			console.log('There was an ERROR: ', error);
		});
}

app.get("/viewMatches", async (request, response) => {
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

})

app.post("/viewMatchesProcess", (request, response) => {
	const variables = {
		NAME: "name",
		Picture: "Picture",
		Type: "type:",
		Gender: "Gender",
		Species: "Species",
		Height: "Height",
		Ability: "Ability",
		backgroundInfo: "Background Information"

	}
	response.render("viewMatchesProcess", variables);
})

app.post("/match", (request, response) => {
	mongoclient.connect(async err => {
		await matches.insertOne({
			name: request.body.name
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
		else {
			console.log(`Invalid command: ${command}`);
		}
		process.stdout.write("^_^: ");
	}
});