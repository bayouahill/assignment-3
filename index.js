//npm install dotenv - explain
//npm install express-session - explain
//create the .env file

// Load environment variables from .env file into memory
// Allows you to use process.env
require('dotenv').config();

const express = require("express");

//Needed for the session variable - Stored on the server to hold data
const session = require("express-session");

let path = require("path");

// Allows you to read the body of incoming HTTP requests and makes that data available on req.body
let bodyParser = require("body-parser");

// Multer for handling file uploads
const multer = require("multer");

// File system module for creating directories
const fs = require("fs");

let app = express();

// Use EJS for the web pages - requires a views folder and all files are .ejs
app.set("view engine", "ejs");

// Root directory for static images
const uploadRoot = path.join(__dirname, "images");
// Sub-directory where uploaded profile pictures will be stored
const uploadDir = path.join(uploadRoot, "uploads");

// Create the directories if they don't exist
if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Public folder for default images
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// cb is the callback function
// The callback is how you hand control back to Multer after
// your customization step
// Configure Multer's disk storage engine
// Multer calls it once per upload to ask where to store the file. Your function receives:
// req: the incoming request.
// file: metadata about the file (original name, mimetype, etc.).
// cb: the callback.
const storage = multer.diskStorage({
    // Save files into our uploads directory
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    // Reuse the original filename so users see familiar names
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
// Create the Multer instance that will handle single-file uploads
const upload = multer({ storage });
// Expose everything in /images (including uploads) as static assets
app.use("/images", express.static(uploadRoot));
// Serve static files from public folder (for Pokemon images and default profile pictures)
app.use("/public", express.static(path.join(__dirname, "public")));

// process.env.PORT is when you deploy and 3000 is for test
const port = process.env.PORT || 3000;

/* Session middleware (Middleware is code that runs between the time the request comes
to the server and the time the response is sent back. It allows you to intercept and
decide if the request should continue. It also allows you to parse the body request
from the html form, handle errors, check authentication, etc.)

REQUIRED parameters for session:
secret - The only truly required parameter
    Used to sign session cookies
    Prevents tampering and session hijacking with session data

OPTIONAL (with defaults):
resave - Default: true
    true = save session on every request
    false = only save if modified (recommended)

saveUninitialized - Default: true
    true = create session for every request
    false = only create when data is stored (recommended)
*/

app.use(
    session(
        {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
        }
    )
);

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

// Global authentication middleware - runs on EVERY request
app.use((req, res, next) => {
    // Skip authentication for login routes
    if (req.path === '/' || req.path === '/login' || req.path === '/logout') {
        //continue with the request path
        return next();
    }
    
    // Check if user is logged in for all other routes
    if (req.session.isLoggedIn) {
        //notice no return because nothing below it
        next(); // User is logged in, continue
    } 
    else {
        res.render("login", { error_message: "Please log in to access this page" });
    }
});

// Main page route - displays Pokemon list (index page) after logging in
app.get("/", (req, res) => {
    // Check if user is logged in
    if (req.session.isLoggedIn) {
        knex.select().from("pokemon")
            .orderBy('description', 'asc')
            .then(pokemon => {
                console.log(`Successfully retrieved ${pokemon.length} pokemon from database`);
                res.render("index", {
                    pokemon: pokemon
                });
            })
            .catch((err) => {
                console.error("Database query error:", err.message);
                res.render("index", {
                    pokemon: [],
                    error_message: `Database error: ${err.message}. Please check if the 'pokemon' table exists.`
                });
            });
    }
    else {
        res.render("login", { error_message: "" });
    }
});

// Users landing page - displays all users
app.get("/users", (req, res) => {
    knex.select().from("users")
        .then(users => {
            console.log(`Successfully retrieved ${users.length} users from database`);
            res.render("landing", {
                users: users,
                userLevel: req.session.userLevel || 'U' // Pass user level to view
            });
        })
        .catch((err) => {
            console.error("Database query error:", err.message);
            res.render("landing", {
                users: [],
                userLevel: req.session.userLevel || 'U',
                error_message: `Database error: ${err.message}. Please check if the 'users' table exists.`
            });
        });
});

// This creates attributes in the session object to keep track of user and if they logged in
app.post("/login", (req, res) => {
    let sName = req.body.username;
    let sPassword = req.body.password;

    knex.select("username", "password", "level")
    .from('users')
    .where("username", sName)
    .andWhere("password", sPassword)
    .then(users => {
      // Check if a user was found with matching username AND password
      if (users.length > 0) {
        req.session.isLoggedIn = true;
        req.session.username = sName;
        req.session.userLevel = users[0].level || 'U'; // Store user level (M or U)
        res.redirect("/");
      } else {
        // No matching user found
        res.render("login", { error_message: "Invalid login" });
      }
    })
    .catch(err => {
      console.error("Login error:", err);
      res.render("login", { error_message: "Invalid login" });
    });

});

// Logout route
app.get("/logout", (req, res) => {
    // Get rid of the session object
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});

app.get("/addUser", (req, res) => {
    res.render("addUser");
});

app.post("/addUser", upload.single("profileImage"), (req, res) => {
    // Destructuring grabs them regardless of field order.
    const { username, password, level } = req.body;
    // Basic validation to ensure required fields are present.
    if (!username || !password || !level) {
        return res.status(400).render("addUser", { error_message: "Username, password, and level are required." });
    }
    // Validate level is either M or U
    if (level !== 'M' && level !== 'U') {
        return res.status(400).render("addUser", { error_message: "Level must be either Manager (M) or User (U)." });
    }
    // Build the relative path to the uploaded file so the
    // browser can load it later.
    const profileImagePath = req.file ? `/images/uploads/${req.file.filename}` : null;
    // Shape the data to match the users table schema.
    const newUser = {
        username,
        password,
        level,
        profile_image: profileImagePath
    };
    // Insert the record into PostgreSQL and return the user list on success.
    knex("users")
        .insert(newUser)
        .then(() => {
            res.redirect("/users");
        })
        .catch((dbErr) => {
            console.error("Error inserting user:", dbErr.message);
            // Database error, so show the form again with a generic message.
            res.status(500).render("addUser", { error_message: "Unable to save user. Please try again." });
        });
});

app.get("/editUser/:id", (req, res) => {
    const userId = req.params.id;
    knex("users")
        .where({ user_id: userId })
        .first()
        .then((user) => {
            if (!user) {
                return res.status(404).render("landing", {
                    users: [],
                    userLevel: req.session.userLevel || 'U',
                    error_message: "User not found."
                });
            }
            res.render("editUser", { user, error_message: "" });
        })
        .catch((err) => {
            console.error("Error fetching user:", err.message);
            res.status(500).render("landing", {
                users: [],
                userLevel: req.session.userLevel || 'U',
                error_message: "Unable to load user for editing."
            });
        });
});

app.post("/editUser/:id", upload.single("profileImage"), (req, res) => {
    const userId = req.params.id;
    const { username, password, level, existingImage } = req.body;
    if (!username || !password || !level) {
        return knex("users")
            .where({ user_id: userId })
            .first()
            .then((user) => {
                if (!user) {
                    return res.status(404).render("landing", {
                        users: [],
                        userLevel: req.session.userLevel || 'U',
                        error_message: "User not found."
                    });
                }
                res.status(400).render("editUser", {
                    user,
                    error_message: "Username, password, and level are required."
                });
            })
            .catch((err) => {
                console.error("Error fetching user:", err.message);
                res.status(500).render("landing", {
                    users: [],
                    userLevel: req.session.userLevel || 'U',
                    error_message: "Unable to load user for editing."
                });
            });
    }
    // Validate level is either M or U
    if (level !== 'M' && level !== 'U') {
        return knex("users")
            .where({ user_id: userId })
            .first()
            .then((user) => {
                res.status(400).render("editUser", {
                    user,
                    error_message: "Level must be either Manager (M) or User (U)."
                });
            });
    }
    const profileImagePath = req.file ? `/images/uploads/${req.file.filename}` : existingImage || null;
    const updatedUser = {
        username,
        password,
        level,
        profile_image: profileImagePath
    };
    knex("users")
        .where({ user_id: userId })
        .update(updatedUser)
        .then((rowsUpdated) => {
            if (rowsUpdated === 0) {
                return res.status(404).render("landing", {
                    users: [],
                    userLevel: req.session.userLevel || 'U',
                    error_message: "User not found."
                });
            }
            res.redirect("/users");
        })
        .catch((err) => {
            console.error("Error updating user:", err.message);
            knex("users")
                .where({ user_id: userId })
                .first()
                .then((user) => {
                    if (!user) {
                        return res.status(404).render("landing", {
                            users: [],
                            userLevel: req.session.userLevel || 'U',
                            error_message: "User not found."
                        });
                    }
                    res.status(500).render("editUser", {
                        user,
                        error_message: "Unable to update user. Please try again."
                    });
                })
                .catch((fetchErr) => {
                    console.error("Error fetching user after update failure:", fetchErr.message);
                    res.status(500).render("landing", {
                        users: [],
                        userLevel: req.session.userLevel || 'U',
                        error_message: "Unable to update user."
                    });
                });
        });
});

app.post("/deleteUser/:id", (req, res) => {
    knex("users").where("user_id", req.params.id).del().then(users => {
        res.redirect("/users");
    }).catch(err => {
        console.log(err);
        res.status(500).json({err});
    })
});

// Search pokemon route - finds specific pokemon and shows name and base_total
app.post("/searchPokemon", (req, res) => {
    const pokemonName = req.body.pokemonName;

    knex.select('description', 'base_total')
        .from("pokemon")
        .where('description', 'ilike', `%${pokemonName}%`)
        .first()
        .then(pokemon => {
            res.render("result", {
                pokemon: pokemon,
                searchTerm: pokemonName
            });
        })
        .catch((err) => {
            console.error("Database query error:", err.message);
            res.render("result", {
                pokemon: null,
                searchTerm: pokemonName,
                error_message: `Database error: ${err.message}`
            });
        });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});