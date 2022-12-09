/* Port Arguments */
if(process.argv.length !== 3) {
	console.log(">:(\nUsage: pokemonFinderServer.js portNumber");
	process.exit(1);
}
else {
    var portNumber = process.argv[2];
}

/* Basic Setup */
const express = require("express");
const bodyParser = require('body-parser');
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const uri = `mongodb+srv://${userName}:${password}@cluster0.l9m35rn.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;

/* App Setup */
const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

/* App Endpoints */
app.get("/", (request, response) => {
    response.render("index");
});

/* Server Console Logic */
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
		else {
			console.log(`Invalid command: ${command}`);
		}
		process.stdout.write("^_^: ");
	}
});