const express = require('express');
const mongodb = require('mongodb');
const assert = require('assert');
const session = require('express-session');

const router = express.Router();

router.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));

const MongoClient = mongodb.MongoClient;
const mongoUrl = 'mongodb+srv://Igasus:11062002Igasus@yad-database-cluster-r8sn3.gcp.mongodb.net/test?retryWrites=true&w=majority';
const mongoClient = new MongoClient(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let db = null;
let accountsCollection = null;
let accounts = [];
const mainAccount = {
  username: "admin",
  password: "admin",
  post: "admin"
}
const databaseReconnectDelay = 10000; //In miliseconds

function connectDatabase() {
  mongoClient.connect(err => {
    if (err) {
      console.log("Error while connecting yad-database:");
      console.log(err);
      accounts = [mainAccount];
      console.log("Next connection try in " + databaseReconnectDelay + " miliseconds.");
      setTimeout(() => {
        connectDatabase();
      }, databaseReconnectDelay);
      return false;
    }
    db = mongoClient.db('yad-database');
    accountsCollection = db.collection('accounts');
    console.log("yad-database has been connected successfuly!");
    updateAccountsOnServer().then(() => {
      console.log("\nyad-database accounts:");
      console.log(accounts);
    });
    return true;
  });
}

connectDatabase();




let updateAccountsOnServer = async () => {
  accounts = [mainAccount];
  if (!db)
    return;
  let cursor = accountsCollection.find();
  await cursor.forEach((account) => accounts.push(account));
}



function showAccounts() {
  console.log(accounts);
}



function findAccountByUsername(username) {
  let account = null;
  accounts.forEach((acc) => {
    if (acc.username == username)
      account = acc;
  });
  return account;
}




router.post('/login', (req, res) => {
  console.log(req.body.username  + " " + req.body.password);
  let account = findAccountByUsername(req.body.username);
  if (account) {
    if (req.body.password == account.password) {
      console.log('\n(POST):admin/login  ->  Log-in successed:');
      console.log(account);
      req.session.isLoggedIn = true;
      return res.send(true);      // True - Log-in successed.
    }

    console.log('\n(POST):admin/login  ->  Incorrect password:');
  }
  else
    console.log('\n(POST):admin/login  ->  Unexisted login:');

  console.log({
    RequestUsername: req.body.username,
    RequestPassword: req.body.password
  });
  return res.send(false);     // False - Incorrect data.
});



router.post('/register', (req, res) => {

  let account = findAccountByUsername(req.body.username);
  if (account) {
    console.log('\n(POST):admin/register  ->  Account already exists:');
    console.log(account);
    return res.send(false);      // False - Account already exist.
  }

  account = {
    username: req.body.username,
    password: req.body.password,
    post: 'worker'
  };

  accountsCollection.insertOne(account)
  .then((result) => {
    updateAccountsOnServer();
    console.log('\n(POST):admin/register  ->  Account inserted to database:');
    console.log(account);
    return res.send(true);     // True - Account created.
  });
});



router.get('/check-session', (req, res) => {
  // if (req.session.isLoggedIn)
  //   return res.send(true);
  // else {
  //   req.session.isLoggedIn = false;
  //   return res.send(false);
  // }

  if (!req.session.counter)
    req.session.counter = 0;
  req.session.counter++;

  return res.json({data: req.session.counter});
});



module.exports = router;
