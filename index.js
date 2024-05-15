import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "1234",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let countries, user_color, users;


async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id=$1", [currentUserId]);
  countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
}

app.get("/", async (req, res) => {
  await checkVisisted();
  users=await db.query("select * from users;");
  user_color=users.rows.find((user)=> user.id==currentUserId);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users.rows,
    color: user_color.color
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    console.log(countryCode);
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2);",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        color: user_color.color,
        users: users.rows,
        error: "country already exists, Try again!"
      });
    }
  } catch (err) {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        color: user_color.color,
        users: users.rows,
        error: "country doesn't exists, Try again!"
      });
  }
});
app.post("/user", async (req, res) => {
  if(req.body.user){
    currentUserId=parseInt(req.body.user);
    res.redirect("/");
  }else{
    res.render("new.ejs");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const result=await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id", [req.body.name, req.body.color]);
  currentUserId=parseInt(result.rows[0].id);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
