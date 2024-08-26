const express = require('express')
const logger = require('morgan')
const cors = require('cors')
const mongoose = require('mongoose') // added mongoose

const contactsRouter = require('./routes/api/contacts')

const app = express()

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short'

app.use(logger(formatsLogger))
app.use(cors())
app.use(express.json())

// Define mongoDBUrl before it's used
const mongoDBUrl = 'mongodb+srv://spongkj:lkyG5ZtEEzR7BopC@clustergoit.vyt5o.mongodb.net/db-contacts?retryWrites=true&w=majority&appName=ClusterGoit';

mongoose.connect(mongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database connection successful'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

app.use('/api/contacts', contactsRouter)

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message })
})

module.exports = app
