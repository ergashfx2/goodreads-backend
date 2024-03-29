const { Router } = require('express');
const router = Router();
const { passwordStrength } = require('check-password-strength');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const jwtSecret = '12345';
const Database = require('../database/database');
const pool = require("../config/db");
const db = new Database();
let crypto = require("crypto");
const { jwtDecode } = require('jwt-decode');
const bcrypt = require('bcrypt');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];

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
    const db = await pool.query(`SELECT * FROM users`)
    res.status(200).json(db.rows)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/create/', async (req, res) => {
  try {
    let { name, email, password } = req.body;
    const selectResult = await db.select_user(email)
    if (selectResult.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (passwordStrength(password).value == 'Too weak' || passwordStrength(password).value == 'Weak') {
      return res.status(400).json({ message: 'Password is too common. Please try different password' });
    }
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    const creation = await db.create_user(name, email, hashedPassword)
    if (creation.success == true) {
      const token = jwt.sign({ email: email, uuid: creation.uuid }, jwtSecret);
      res.status(200).json({
        success: true,
        message: "User created successfully",
        token: token
      });

    } else {
      return res.status(400).json({ message: "Something went wrong please try with different informations" })
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: error.message });
  }
});



router.post('/login/', async (req, res) => {
  const { email, password } = req.body;
  try {
    const respond = await db.select_user(email)
    if (respond.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const hashedPassword = respond[0].password;
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const token = jwt.sign({ email: email, uuid: respond[0].id }, jwtSecret);
    res.status(200).json({ message: "Login successful", token: token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: "Failed to login" });
  }
});


router.get('/my-collections/', verifyToken, async (req, res) => {
  const collections = await db.get_collections(req.uuid)
  res.status(200).json({
    'collections': collections
  })


})

router.post('/create-collection/', verifyToken, async (req, res) => {
  const {collection_name,custom_fields} = req.body
  try {

    const selected = await db.select_collection(collection_name,req.uuid)
    if (selected.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You already have collection with name " + collection_name
      })
    }

    const respond = await db.create_collection(collection_name,custom_fields,req.uuid)
    if (respond.success == true) {
      res.status(200).json({
        success: true,
        message: "Collection created successfully",
        id: crypto.randomUUID()
      })

    } else {
      res.status(401).json({
        message: respond.success
      })
    }
  } catch (error) {
  }


})


router.patch('/update-collection/', verifyToken, async (req, res) => {
  const {col,collection_name,collection_id} = req.body
  await db.update_collection(col,collection_name,collection_id)
  res.status(200).json({
    collection_names : collection_name,
    id : crypto.randomUUID()
  })


})


router.post('/delete-collections/', verifyToken, async (req, res) => {
  const collection_id = req.body.collection_id
  try {
    const respond = await db.delete_collection(req.uuid, collection_id)
    if (respond.success == true) {
      res.status(200).json({
        success: true,
        message: "Collection deleted successfully",
        id: crypto.randomUUID()
      })

    } else {
      res.status(401).json({
        message: respond.success
      })
    }
  } catch (error) {

  }


})

router.get('/get-collection/',verifyToken,async (req,res)=>{
  const col_id = req.query.id;
  const collection =  await db.select_collection_by_id(parseInt(col_id))
  res.status(200).json({
    collection : collection,
    id : crypto.randomUUID()
  })
})


router.get('/collection-items/', verifyToken, async (req, res) => {
  const collectionId = req.query.collection_id;
  const collection_items = await db.select_collection_items(collectionId.toString());
  res.status(200).json({
    success: true,
    items: collection_items,
    collection_id: req.query.collection_id,
    message: "ok"
  })


})

router.post('/create-item/', verifyToken, async (req, res) => {
  const {title,description,category,tags,images,collection,customData} = req.body
  try {
    const item = await db.create_item(title,description,category,req.uuid,tags,images[0],[customData],parseInt(collection))
    if (item.success) {
      res.status(200).json({
        success: true,
      })
    }
  } catch (err) {
    console.log(err)

  }
})

router.delete('/delete-item/',verifyToken,async (req,res)=>{
  const respond = await db.delete_item(req.uuid,req.query.item_id)
  if (respond.success){
    res.status(200).json({
      success : true,
      id : crypto.randomUUID
    })
  }else {
    req.status(403).json({
      success : false,
      id : crypto.randomUUID
    })
  }

})


router.patch('/update-item/', verifyToken, async (req, res) => {
  try {
    const { title, description, tags, images, customData, category, collection, id } = req.body;
    const imageUrl = images[0];
    await db.updateItem(title, description, category, customData, req.uuid, tags, imageUrl, collection, id);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});


router.get('/item-detail/', async (req, res) => {
  const item = await db.get_item_detail(req.query.item_id);
  res.status(200).json({
    success: true,
    item: item,
    message: "ok"
  })
})

router.get('/get-feeds/', async (req, res) => {
  try {
      let likes = [];

      if (req.headers['authorization']) {
          const token = req.headers['authorization'].split(' ')[1];
          const decodedToken = jwtDecode(token);
          const all_likes = await db.get_user_likes(decodedToken.uuid);
          likes = all_likes.map((item) => item.item_id);
      }

      let feeds;
      if (req.query.category) {
          (req.query.category);
          feeds = await db.filter_feeds(req.query.category);
      } else {
          feeds = await db.get_feeds();
      }

      res.status(200).json({
          success: true,
          feeds: feeds,
          likes: likes
      });
  } catch (error) {
      console.error("Error fetching feeds:", error);
      res.status(500).json({ success: false, error: "Error fetching feeds" });
  }
});


router.get('/my-profile/', verifyToken, async (req, res) => {
  const profile = await db.my_profile(req.uuid)
  res.status(200).json({
    success: true,
    profile: profile
  })
})


router.get('/get-profile/', async (req, res) => {
  if (!req.query.author_id) {
    const profile = await db.my_profile(req.uuid)
    res.status(200).json({
      success: true,
      profile: profile
    })
  } else {
    const author_id = req.query.author_id
    const profile = await db.get_profile(author_id)
    res.status(200).json({
      success: true,
      profile: profile
    })
  }
})

router.patch('/update-user/', verifyToken, async (req, res) => {
  if (req.body.image) {
    const upload = await db.update_user_image(req.uuid, req.body.image)
    if (upload.success) {
      res.status(200).json({
        success: true,
        message: "Updated successfully",
        image: req.body.image
      })
      ("Success")
    } else {
      res.status(400).json({
        success: false,
        message: "Something went wrong"
      })
    }
  } else {
    const user = req.body;
    const update = await db.update_user_info(user.name, user.email, user.bio, user.gender, user.address, req.uuid)
    if (update.success) {
      res.status(200).json({
        success: true,
        message: "Updated Successfully"
      })
    } else {
      res.status(400).json({
        success: false,
        message: "Something went wrong"
      })
    }

  }

})

router.post('/like/', verifyToken, async (req, res) => {
  const like = req.body
  const response = await db.like(like.item_id, req.uuid)
  if (response.success) {
    res.status(200).json({
      success: true,
      id: crypto.randomUUID()
    })
  }
})

router.post('/unlike/', verifyToken, async (req, res) => {
  const like = req.body
  const response = await db.unlike(like.item_id, req.uuid)
    res.status(200).json({
      success: true,
      id: crypto.randomUUID()

})
})

router.post('/comment/', verifyToken, async (req, res) => {
  const comment = req.body
  await db.create_comment(comment.comment,comment.item_id, req.uuid)
    res.status(200).json({
      success: true,
      id: crypto.randomUUID()
    })

})

router.get('/my-liked-items/', verifyToken, async (req, res) => {
  const uuid = req.uuid
  const items = await db.get_my_liked_items(uuid)
  res.status(200).json({
    success: true,
    items: items
  })
})



module.exports = router