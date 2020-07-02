
require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const Person = require('./models/person')

const app = express()
app.use(cors())
app.use(express.static('build'))
app.use(express.json())

morgan.token('person', function getPerson(req) {
  return JSON.stringify(req.body)
})

// app.use(morgan(':method :url :status :res[content-length] - :response-time ms :person'))
app.use(morgan(function (tokens, req, res) {
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    tokens.method(req, res) === 'POST' ? tokens.person(req, res) : null
  ].join(' ')
}))

app.get('/api/persons', (req, res) => {
  Person.find({}).then(person => {
    res.json(person)
  })
})

app.get('/api/persons/:id', (req, res, next) => {
  Person.findById(req.params.id).then(person => {
    if (person) {
      res.json(person)
    } else {
      res.status(404).end()
    }
  })
    .catch(error => next(error))
})

app.delete('/api/persons/:id', (req, res, next) => {
  Person.findByIdAndDelete(req.params.id)
    .then(() => {
      res.status(204).end()
    })
    .catch(error => next(error))
})

app.put('/api/persons/:id', (req, res, next) => {
  const body = req.body

  const person = {
    name: body.name,
    number: body.number,
  }

  console.log(person)

  const options = {
    new: true,
    runValidators: true,
    context: 'query'
  }

  // JS object with new as true gives us the updated object back instead of the original
  Person.findByIdAndUpdate(req.params.id, person, options)
    .then(updatedPerson => {
      res.json(updatedPerson)
    })
    .catch(error => {
      console.log(error)
      next(error)
    })
})

app.post('/api/persons', (req, res, next) => {
  const body = req.body

  if (!body.name || !body.number) {
    return res.status(400).json({
      error: 'missing name or number'
    })
  }

  // id generation is handled by mongoDB
  const person = new Person({
    name: body.name,
    number: body.number
  })

  person.save()
    .then(() => {
      res.json(person)
    })
    .catch(error => next(error))
})

app.get('/info', (req, res) => {
  const date = new Date()
  Person.find({}).then(person => {
    res.send(`<p>Phonebook has info for ${person.length} people</p>
    <p>${date}</p>`)
  })
})

const errorHandler = (error, req, res, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return res.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message })
  }

  next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})