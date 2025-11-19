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
        port : process.env.DB_PORT || 5432  
    }
});

// Tells Express how to read form data sent in the body of a request
app.use(express.urlencoded({extended: true}));

// Main page route - displays all pokemon ordered by name
app.get("/", (req, res) => {
    knex.select().from("pokemon")
        .orderBy('description', 'asc')
        .then(pokemon => {
            console.log(`Successfully retrieved ${pokemon.length} pokemon from database`);
            res.render("displayPokemon", {
                pokemon: pokemon
            });
        })
        .catch((err) => {
            console.error("Database query error:", err.message);
            res.render("displayPokemon", {
                pokemon: [],
                error_message: `Database error: ${err.message}. Please check if the 'pokemon' table exists.`
            });
        });
});

// Search pokemon route - finds specific pokemon and shows name and base_total
app.post("/searchPokemon", (req, res) => {
    const pokemonName = req.body.pokemonName;

    knex.select('description', 'base_total')
        .from("pokemon")
        .where('description', 'ilike', `%${pokemonName}%`)
        .first()
        .then(pokemon => {
            res.render("searchPokemon", {
                pokemon: pokemon,
                searchTerm: pokemonName
            });
        })
        .catch((err) => {
            console.error("Database query error:", err.message);
            res.render("searchPokemon", {
                pokemon: null,
                searchTerm: pokemonName,
                error_message: `Database error: ${err.message}`
            });
        });
});

app.listen(port, () => {
    console.log("The server is listening");
});