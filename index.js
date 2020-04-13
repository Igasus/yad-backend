const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongodb = require('mongodb');
const assert = require('assert');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 5000;
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'projects/');
  },
  filename: (req, file, cb) => {
    let uniquePrefix = 1000000;
    let projectImages = getDirectoryFiles('./projects/');
    if (projectImages.length > 0) {
      let lastImage = projectImages[projectImages.length-1];
      uniquePrefix = parseInt(lastImage.slice(0, 7)) + 1;
    }
    cb(null, uniquePrefix + '-' + file.originalname);
  }
});
const upload = multer({ storage: multerStorage });


let getDirectoryFiles = (path) => {
  let directoryFiles = [];
  let allDirectoryFiles = fs.readdirSync(path);
  for (let fileName of allDirectoryFiles) {
    if (fileName[0] == '.')
      continue;
    directoryFiles.push(fileName);
  }
  return directoryFiles;
}



const MongoClient = mongodb.MongoClient;
const mongoUrl = 'mongodb+srv://Igasus:11062002Igasus@yad-database-cluster-r8sn3.gcp.mongodb.net/test?retryWrites=true&w=majority';
const mongoClient = new MongoClient(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const sessionsStore = new MongoDBStore({
  uri: mongoUrl,
  collection: 'Sessions'
});

sessionsStore.on('error', function(error) { console.log(error); });

app.use(session({
  secret: 'keyboard cat',
  store: sessionsStore,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));


app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/projects', express.static(__dirname + '/projects'));




let db = null;
let accountsCollection = null;
let accounts = [];
const mainAccount = {
  username: "admin",
  password: "admin",
  post: "admin"
}
const databaseReconnectDelay = 2000; //In miliseconds

function connectDatabase() {
  mongoClient.connect(err => {
    if (err) {
      reconnectPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          connectDatabase();
        }, databaseReconnectDelay);
      });

      console.log("Error while connecting yad-database:");
      console.log(err);
      accounts = [mainAccount];
      console.log("\n\nNext connection try in " + databaseReconnectDelay + " miliseconds.");
      reconnectPromise;
      return false;
    }
    db = mongoClient.db('yad-database');
    accountsCollection = db.collection('Accounts');
    console.log("\n\nyad-database has been connected successfuly!");
    updateAccountsOnServer().then(() => {
      console.log("\n\nyad-database accounts:");
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


let showAccounts = () => {
  console.log(accounts);
}


let findAccountByUsername = (username) => {
  let account = null;
  accounts.forEach((acc) => {
    if (acc.username == username)
      account = acc;
  });
  return account;
}




app.post('/admin/sign/in', (req, res) => {
  let account = findAccountByUsername(req.body.username);
  if (account) {
    if (req.body.password == account.password) {
      console.log('\n\n(POST):admin/sign/in  ->  Log-in successed:');
      console.log(account);
      req.session.username = account.username;
      return res.send(true);      // True - Log-in successed.
    }

    console.log('\n\n(POST):admin/sign/in  ->  Incorrect password:');
  }
  else
    console.log('\n\n(POST):admin/sign/in  ->  Unexisted login:');

  console.log({
    RequestUsername: req.body.username,
    RequestPassword: req.body.password
  });
  return res.send(false);     // False - Incorrect data.
});




app.post('/admin/sign/up', (req, res) => {
  let account = findAccountByUsername(req.body.username);
  if (account) {
    console.log('\n\n(POST):admin/sign/up  ->  Account already exists:');
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
    console.log('\n\n(POST):admin/sign/up  ->  Account inserted to database:');
    console.log(account);
    return res.send(true);     // True - Account created.
  });
});




app.get('/admin/sign/out', (req, res) => {
  console.log("\n\n(GET):admin/sign/out  ->  SessionID: " + req.sessionID + "\n  Cleared login: " + req.session.username);
  req.session.username = "";
  return res.send(true);
});




app.get('/admin/sign/check', (req, res) => {
  if (req.session.username) {
    console.log("\n\n(GET):admin/sign/check  ->  SessionID: " + req.sessionID + "\n  Result: True \n  Username: " + req.session.username);
    return res.send(true);
  }
  // console.log("\n\n(GET):admin/sign/check  ->  SessionID: " + req.sessionID + "\n  Result: False");
  return res.send(false);
});




app.get('/admin/account', (req, res) => {
  let username = req.session.username;
  let account = findAccountByUsername(username);
  if (account) {
    console.log("\n\n(GET):admin/account  ->  SessionID: " + req.sessionID + "\n  Account username: " + account.username);
    return res.json(account);
  }

  return res.send(null);
});




app.post('/admin/account', (req, res) => {
  let username = req.body.username;
  console.log("\n\n(POST):admin/account  ->  Account username: " + req.session.username);

  if (username) {
    let account = findAccountByUsername(username);
    console.log("Requested account " + username);
    if (account) {
      console.log("  Result: Success");
      return res.json(account);
    }

    console.log("  Result: Not found");
    return res.send(null);
  }

  console.log("Requested add accounts");
  return res.json({accounts: accounts});
});




app.post('/projects/add', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    console.log('\n\n(POST):projects/add  ->  Error: No file');
    return res.send(false);
  }
  console.log('\n\n(POST):projects/add  ->  File has been added: ' + file.filename);
  return res.send(true);
});




app.get('/projects/getLinks', (req, res) => {
  let projects = getDirectoryFiles('./projects/');
  res.send(projects);
});




app.listen(port, () => console.log('Backend is listening on port ' + port + '!'));
