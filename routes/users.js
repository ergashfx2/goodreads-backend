const { Router } = require('express');
const router = Router();
const { passwordStrength } = require('check-password-strength');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const jwtSecret = '12345';
const User = require('../database/database');
const pool = require("../config/db");
const Users = new User();
let crypto = require("crypto");

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  console.log(token)

  if (!token) {
    return res.status(403).json({ message: 'Token not provided' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Failed to authenticate token' });
    }
    req.uuid = decoded.uuid;
    next();
  });
};



router.get('/', async (req, res) => {
  try {
    const users = await pool.query(`SELECT * FROM users`)
    res.status(200).json(users.rows)
  } catch (error) {
    res.status(500).json({message: error.message})    
  }
})

router.post('/create/', async (req, res) => {
    try {
      let { name, email, password } = req.body;
      const selectResult = await Users.select_user(email)
      console.log(selectResult)
      if (selectResult.length > 0) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      if (passwordStrength(password).value == 'Too weak' || passwordStrength(password).value == 'Weak') {
        console.log(passwordStrength(password).value)
        return res.status(400).json({ message: 'Password is too weak' });
      }
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);
      const creation = await Users.create_user(name,email,hashedPassword)
      if (creation.success == true) {
        const token = jwt.sign({ email: email,uuid: creation.uuid }, jwtSecret);
        res.status(200).json({
          success: true,
          message: "User created successfully",
          token:token
        });

      }else{
        return res.status(400).json({message: "Something went wrong please try with different informations"})
      }
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: error.message });
    }
  });
  


  router.post('/login/', async (req, res) => {
    const { email, password } = req.body;
    try {
        const respond = await Users.select_user(email)
        if (respond.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const hashedPassword = respond[0].password;
        const passwordMatch = await bcrypt.compare(password, hashedPassword);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }
        const token = jwt.sign({ email: email,uuid: respond[0].id }, jwtSecret);
        res.status(200).json({ message: "Login successful",token: token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: "Failed to login" });
    }
});


router.get('/my-collections/',verifyToken, async (req,res)=>{
  const collections = await Users.get_collections(req.uuid)
  console.log(collections)
  res.status(200).json({
    'collections': collections
  })


}) 

router.post('/create-collection/',verifyToken, async(req,res)=>{
  const collection_name = req.body.collection_name
  try {

    const selected = await Users.select_collection(collection_name)
    if (selected.length > 0){
      return res.status(400).json({
        success: false,
        message : "You already have collection with name " +  collection_name
      })
    }

    const respond = await Users.create_collection(collection_name,req.uuid)
    if (respond.success == true){
      res.status(200).json({
        success : true,
        message : "Collection created successfully",
        id : crypto.randomUUID()
      })

    }else {
      res.status(401).json({
        message : respond.success
      })
    }
  }catch(error){
    console.log(error)
  }


})

router.post('/delete-collection/',verifyToken, async(req,res)=>{
  const collection_name = req.body.collection_name
  try {
    const respond = await Users.delete_collection(collection_name,req.uuid)
    if (respond.success == true){
      res.status(200).json({
        success : true,
        message : "Collection created successfully",
        id : crypto.randomUUID()
      })

    }else {
      res.status(401).json({
        message : respond.success
      })
    }
  }catch(error){
    console.log(error)
  }


})



module.exports = router