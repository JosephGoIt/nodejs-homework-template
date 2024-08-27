require('dotenv').config();

const express = require('express')
const logger = require('morgan')
const cors = require('cors')
const mongoose = require('mongoose') // added mongoose

const contactsRouter = require('./routes/api/contacts')
const usersRouter = require('./routes/api/users')

const app = express()

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short'

app.use(logger(formatsLogger))
app.use(cors())
app.use(express.json())

// Define mongoDBUrl before it's used
const mongoDBUrl = 'mongodb+srv://spongkj:lkyG5ZtEEzR7BopC@clustergoit.vyt5o.mongodb.net/db-contacts?retryWrites=true&w=majority&appName=ClusterGoit';

//remove useNewParser and useUnifiedTopology as being alredy deprecated
// mongoose.connect(mongoDBUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.connect(mongoDBUrl)
  .then(() => console.log('Database connection successful'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

app.use('/api/contacts', contactsRouter)
app.use('/api/users', usersRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message })
})

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app
