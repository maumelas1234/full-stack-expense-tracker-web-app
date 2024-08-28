const express = require('express');
const app = express();
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

app.use(express.json());
app.use(cors());
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
        return;
    }
    console.log("Connected to MySQL:", db.threadId);

    // Create a database
    db.query(`CREATE DATABASE IF NOT EXISTS expense_tracker`, (err, result) => {
        if (err) {
            console.error("Error creating/checking database:", err);
            return;
        }
        console.log("Database expense_tracker created/checked");

        // Select our db
        db.changeUser({ database: 'expense_tracker' }, (err) => {
            if (err) {
                console.error("Error changing database:", err);
                return;
            }

            console.log("Changed to expense_tracker");

            // Create users table
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    username VARCHAR(50) NOT NULL,
                    password VARCHAR(255) NOT NULL
                )
            `;
            db.query(createUsersTable, (err, result) => {
                if (err) {
                    console.error("Error creating/checking users table:", err);
                    return;
                }

                console.log("Users table checked/created");
            });
        });
    });
});

// User registration route
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        const usersQuery = `SELECT * FROM users WHERE email = ?`;
        db.query(usersQuery, [email], async (err, data) => {
            if (err) {
                console.error("Error checking for existing user:", err);
                return res.status(500).json("Error checking for existing user");
            }

            if (data.length > 0) return res.status(409).json("User already exists");

            const hashedPassword = await bcrypt.hash(password, 10);
            const createUser = `INSERT INTO users(email, username, password) VALUES (?, ?, ?)`;

            db.query(createUser, [email, username, hashedPassword], (err, data) => {
                if (err) {
                    console.error("Error creating user:", err);
                    return res.status(500).json("Something went wrong");
                }

                return res.status(200).json("User created successfully");
            });
        });
    } catch (err) {
        console.error("Internal server error:", err);
        res.status(500).json("Internal Server Error");
    }
});

//user login route
app.post('/api/login', async (req, res) => {
    try {
        const users = `SELECT * FROM users WHERE email=?`
        db.query(users, [req.body.email], (err, data) => {
            if (data.length === 0) return res.status(404).json("User not found")

            //check if passworf is valid
            const isPasswordValid = bcrypt.compareSync(req.body.password, data[0].password)

            if (!isPasswordValid) return res.status(400).json("Invalid email or password")
            return res.status(200).json("login successfully")

        })
    } catch (err) {
        res.status(500).json("internal server error")
    }
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
