const express = require('express');
const router = express.Router();
const Database = require('../database/database');
const db = new Database();
const jwt = require('jsonwebtoken');
const jwtSecret = '12345';
const { jwtDecode } = require('jwt-decode');
let crypto = require("crypto");

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];

  if (!token) {
      return res.status(403).json({ message: 'Token not provided' });
  }

  jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
          return res.status(401).json({ message: 'Failed to authenticate token' });
      }

      req.email = decoded.email;
      const admin = await db.select_user(req.email);

      if (admin[0].role !== "Admin" && admin[0].role !== "Creator") {
          return res.status(403).json({
              message: "You don't have permission"
          });
      }

      req.uuid = decoded.uuid

      next();
  });
};


const ProtectCreator = async (req_id, id, name, value) => {
  const user1 = await db.select_user_by_id(req_id);
  const user2 = await db.select_user_by_id(id);
  
  if (
    (name === 'role' || name === 'status') && 
    (value === 'User' || value === 'Admin') && 
    user2[0].role === 'Creator' && 
    user1[0].role === 'Admin'
  ) {
    return false; 
  } else {
    return true; 
  }
};




router.use(verifyAdmin);

router.get('/all-users/',async (req,res)=>{
    res.status(200).json({
        users : await db.selectAll(),
        user : await db.select_user(req.email)
        
    })
})

router.get('/user/',async (req,res)=>{
  const user = await db.select_user_by_id(req.query.user_id)
  res.status(200).json({
      user : user
      
  })
})

router.patch('/update-user/', async (req, res) => {
  let { name, value, id } = req.body;
  const protection = await ProtectCreator(req.uuid, id, name,value);
  if (!protection) {
      return res.status(403).json({ message: 'Permission denied' });
  }

  try {
      await db.update_user(name, value, id);
      res.status(200).json({
          message: `User ${name}ed successfully`,
          user_id: req.user_id,
          id: crypto.randomUUID()
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Something went wrong' });
  }
});


router.patch('/updates-datas/user/', async (req, res) => {
  const user = req.body;
    const update = await db.update_user_info(user.name, user.email, user.bio, user.gender, user.address, user.id)
    if (update.success) {
      res.status(200).json({
        success: true,
        message: "Updated Successfully",
        id : crypto.randomUUID()
      })
    } else {
      res.status(400).json({
        success: false,
        message: "Something went wrong"
      })
    }
});


router.get('/get-userAll/',async (req,res)=>{
  const items = await db.select_itemsAll(req.query.user_id)
  res.status(200).json({
    user : await db.select_user_by_id(req.query.user_id),
    collections : await db.get_collections(req.query.user_id),
    items : items,
  })
})

router.delete('/delete-user/:id', async (req, res) => {
  const userId = req.params.id;
  const respond = await db.delete_user(userId)
  if (respond.success){
    res.status(200).json({
      success : true,
      message : "User deleted successfully",
      id : crypto.randomUUID()
    })
  }

})


router.post('/delete-items/', async (req, res) => {
  const item_id = req.body.item_id;
  const item_name = req.body.item_name;
  const respond = await db.delete_items(item_name,item_id)
  if (respond.success){
    res.status(200).json({
      success : true,
      message :  `${item_name} deleted successfully`,
      id : crypto.randomUUID()
    })
  }

  

});



module.exports = router