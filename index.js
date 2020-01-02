const express = require('express');
const bodyParser = require('body-parser');
const admin = require('./admin');
const gallery = require('./gallery');
const cors = require('cors');

const app = express();
const port = 5000;


app.use(cors({
  origin: 'http://localhost:4200/'
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/admin', admin);
app.use('/gallery', gallery);


app.listen(port, () => console.log('Backend is listening on port ' + port + '!'));
