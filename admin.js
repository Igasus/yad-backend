const express = require('express');
const mongodb = require('mongodb');
const assert = require('assert');

const router = express.Router();


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



let updateAccountsOnServer = async () => {
  if (!db) {
    connectDatabase();
    return;
  }
  accounts = [mainAccount];
  let cursor = accountsCollection.find();
  await cursor.forEach((account) => accounts.push(account));
}



function showAccounts() {
  console.log(accounts);
}



function findAccountByUserame(username) {
  let account = null;
  accounts.forEach((acc) => {
    if (acc.username == username)
      account = acc;
  });
  return account;
}



if (!connectDatabase()) {
  setTimeout(()=> {

  }, databaseReconnectDelay);
};



router.post('/login', (req, res) => {
  res.redirect('http://localhost:4200/admin');
  let account = findAccountByLogin(req.body.username);
  if (account) {
    if (req.body.password == account.password) {
      console.log('\n(POST):admin/login  ->  Log-in successed:');
      console.log(account);
      res.json({ result: true });      // True - Log-in successed.
      return;
    }

    console.log('\n(POST):admin/login  ->  Incorrect password:');
  }
  else
    console.log('\n(POST):admin/login  ->  Unexisted login:');

  console.log({
    RequestUsername: req.body.username,
    RequestPassword: req.body.password
  });
  res.json({ result: false });     // False - Incorrect data.
});



router.post('/register', (req, res) => {
  res.redirect('http://localhost:4200/admin');

  let account = findAccountByLogin(req.body.login);
  if (account) {
    console.log('\n(POST):admin/register  ->  Account already exists:');
    console.log(account);
    res.json({ result: false });      // False - Account already exist.
    return;
  }

  account = {
    username: req.body.username,
    password: req.body.password,
    post: 'worker'
  }
  accountsCollection.insertOne(account)
  .then((result) => {
    updateAccountsOnServer();
    console.log('\n(POST):admin/register  ->  Account inserted to database:');
    console.log(account);
    res.json({ result: true });     // True - Account created.
  });
});



router.get('/check-session', (req, res) => {

});



module.exports = router;
