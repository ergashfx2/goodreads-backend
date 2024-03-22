const express = require('express')
require('dotenv').config()
const cors = require('cors');
const app = express()

app.use(express.json())

app.use('/api', require('./routes'))
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 8081

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`)
})