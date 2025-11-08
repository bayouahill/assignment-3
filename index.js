//npm install dotenv - explain
//create the .env file

// Load environment variables from .env file into memory
// Allows you to use process.env
require('dotenv').config();

const express = require("express");

let path = require("path");

// Allows you to read the body of incoming HTTP requests and makes that data available on req.body
let bodyParser = require("body-parser");

let app = express();

// Use EJS for the web pages - requires a views folder and all files are .ejs
app.set("view engine", "ejs");

// process.env.PORT is when you deploy and 3000 is for test
const port = process.env.PORT || 3000;

const knex = require("knex")({
    client: "pg",
    connection: {
        host : process.env.DB_HOST || "localhost",
        user : process.env.DB_USER || "postgres",
        password : process.env.DB_PASSWORD || "admin",
        database : process.env.DB_NAME || "assignment 3",
        port : process.env.DB_PORT || 5432  // PostgreSQL 16 typically uses port 5434
    }
});

// Tells Express how to read form data sent in the body of a request
app.use(express.urlencoded({extended: true}));

// Main page route - displays all pokemon
app.get("/", (req, res) => {
    knex.select().from("pokemon")
        .then(pokemon => {
            console.log(`Successfully retrieved ${pokemon.length} pokemon from database`);
            res.render("displayPokemon", {pokemon: pokemon});
        })
        .catch((err) => {
            console.error("Database query error:", err.message);
            res.render("displayPokemon", {
                pokemon: [],
                error_message: `Database error: ${err.message}. Please check if the 'pokemon' table exists.`
            });
        });
});

app.listen(port, () => {
    console.log("The server is listening");
});