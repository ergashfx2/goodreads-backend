const express = require('express');
require('dotenv').config();
const cors = require('cors');
const compression = require('compression');
const app = express();

const allowedOrigins = ['https://readopia.vercel.app'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

app.use(compression()); 
app.use(express.json());
app.use('/api', require('./routes'));
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
