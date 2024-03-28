const pool = require("../config/db")
let crypto = require("crypto");
const { use } = require("../routes");


class Database {

    async selectAll () {
        return (await pool.query('SELECT * FROM users')).rows
        
    }

    async select_itemsAll (user_id) {
        try {
            const query = 'SELECT * FROM items WHERE author = $1'
            const res = await pool.query(query,[user_id])
            return res.rows
        }catch(error) {

        }
        
    }

    async select_user(email) {
        const selectQuery = 'SELECT * FROM users WHERE email = $1';
        const selectResult = await pool.query(selectQuery, [email]);

        return selectResult.rows
    }

    async select_user_by_id(id) {
        const selectQuery = 'SELECT * FROM users WHERE id = $1';
        const selectResult = await pool.query(selectQuery, [id]);

        return selectResult.rows
    }

    async create_user(name, email, password) {
        try {
            const insertQuery = 'INSERT INTO users (name, email, password,id) VALUES ($1, $2, $3,$4)';
            const uuid = crypto.randomUUID()
            const res = await pool.query(insertQuery, [name, email, password, uuid]);
            if (res.rowCount > 0) {

                return {
                    "success": true,
                    "uuid": uuid
                }
            }
        } catch(error)  {
            return { success: false };
        }
    }


    async create_collection(name,custom_fields=null, user_id) {
        try {
            const insertQuery = 'INSERT INTO collections (collection_name,custom_fields, user_id) VALUES ($1,$2,$3)';
            const res = await pool.query(insertQuery, [name,custom_fields,user_id]);
            if (res.rowCount > 0) {

                return {
                    success: true,
                }
            }
        } catch (error) {
            return { success: error };
        }
    }


    async get_collections(uuid) {
        const selectQuery = "SELECT * FROM collections WHERE user_id = $1"
        const response = await pool.query(selectQuery, [uuid])
        return response.rows
    }

    async select_collection(collection_name) {
        const selectQuery = "SELECT * FROM collections WHERE collection_name = $1"
        const response = await pool.query(selectQuery, [collection_name])
        return response.rows
    }

    async select_collection_by_id(col_id) {
        try {
            const selectQuery = "SELECT * FROM collections WHERE id = $1"
            const response = await pool.query(selectQuery, [parseInt(col_id)])
            return response.rows
        }catch(error){

        }
    }


    async select_collection_items(collection_id) {
        const selectQuery = "SELECT * FROM items WHERE collection = $1"
        const response = await pool.query(selectQuery, [collection_id])
        return response.rows
    }

    async delete_collection(uuid, collection_id) {
        try {
            const deleteQuery = "DELETE FROM collections WHERE user_id = $1 AND id = $2";
            const response = await pool.query(deleteQuery, [uuid, parseFloat(collection_id)]);
            return {
                success: true

            }
        } catch (error) {
            return {
                success: error,
                message: "Something went wrong"
            }
        }
    }

    async update_collection (col,collection_name,collection_id){
        const query = `UPDATE collections SET ${col} = $1 WHERE id = $2`
        await pool.query(query,[collection_name,parseInt(collection_id)])
    }

    async create_item(title, description, category, author, tags, image, custom_field, collection) {
        try {
            const insertQuery = 'INSERT INTO items (title, description, category, custom_field, author, tags, image, collection) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
            const res = await pool.query(insertQuery, [title, description, category, custom_field, author, tags, image, collection]);
            console.log(res)
            return {
                    success: true,
                }

        } catch (error) {
            console.log(error)
        }
    }

    async updateItem(title, description, category, customField, author, tags, image, collection,item_id) {
        try {
            const updateQuery = `UPDATE items 
                                 SET title = $1, description = $2, category = $3, custom_field = $4, author = $5, tags = $6, image = $7, collection = $8
                                 WHERE id = $9`;
            const res = await pool.query(updateQuery, [title, description, category, customField, author, tags, image, collection, item_id]);
            if (res.rowCount > 0) {
                return {
                    success: true,
                };
            } else {
                return {
                    success: false,
                    message: "No item with the provided ID found.",
                };
            }
        } catch (error) {
            return { success: false, error };
        }
    }
    

    
    async delete_item(uuid, item_ids) {
        try {
            const deleteQuery = "DELETE FROM items WHERE author = $1 AND id = ANY($2)";
            const response = await pool.query(deleteQuery, [uuid, item_ids]);
            return {
                success: true

            }
        } catch (error) {
            return {
                success: false,
                message: "Something went wrong"
            }
        }
    }

    async get_item_detail(item_id) {
        const selectQuery = `
        SELECT 
        i.*,
        u.name AS author_name,
        uc.name AS commenter_name,
        uc.avatar AS commenter_avatar,
        c.comment AS comment
    FROM 
        Items i
    JOIN 
        Users u ON i.author = u.id
    LEFT JOIN 
        Comments c ON i.id = c.item_id
    LEFT JOIN 
        Users uc ON c.user_id = uc.id
    WHERE
        i.id = $1;
    
        `;
        try {
            const response = await pool.query(selectQuery, [item_id]);
            return response.rows;
        } catch (error) {
            console.error('Error fetching item details:', error);
            throw error;
        }
    }
    

    async get_feeds() {
            const selectQuery = 'SELECT items.*, users.name AS author, users.avatar,users.id AS author_id FROM items JOIN users ON items.author = users.id;'
            const response = await pool.query(selectQuery)
            return response.rows
        
    }

    async my_profile(uuid) {
        const selectQuery = "SELECT name,email,status,role,date_registered,id,avatar,gender,address,bio FROM users WHERE id = $1"
        const response = await pool.query(selectQuery, [uuid])
        return response.rows
    }

    async get_profile(uuid) {
        const sqlQuery = `
        SELECT 
            u.name, u.email, u.status, u.role, u.date_registered, u.id,
            u.avatar, u.gender, u.address, u.bio,
            (
                SELECT ARRAY(
                    SELECT ROW_TO_JSON((SELECT d FROM (SELECT title, image, id) d))
                    FROM items
                    WHERE author = u.id
                ) AS items
            ) AS user_items
        FROM 
            users u
        WHERE 
            u.id = $1;
        `;
        
        
        const response = await pool.query(sqlQuery, [uuid])
        return response.rows
    }

    async update_user_image(uuid, image) {
        const updateQuery = "UPDATE users SET avatar = $2 WHERE id = $1";
        try {
            const response = await pool.query(updateQuery, [uuid, image]);
            if (response.rowCount > 0) {
                (response.rows)
                return {
                    success: true,
                    message: crypto.randomUUID()
                };
            } else {
                return {
                    success: false,
                    message: "User not found or image already up to date"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Error updating user image"
            };
        }

    }

    async update_user_info(name, email, bio, gender, address, id) {
        const updateQuery = "UPDATE users SET name = $1,email=$2,bio=$3,gender=$4,address=$5 WHERE id = $6";
        try {
            const response = await pool.query(updateQuery, [name, email, bio, gender, address, id]);
            if (response.rowCount > 0) {
                return {
                    success: true,
                    message: crypto.randomUUID()
                };
            } else {
                return {
                    success: false,
                    message: "User not found"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Error updating user image"
            };
        }

    }

    async like(item_id, user_id) {
        try {
            const query = 'SELECT * FROM likes WHERE item_id = $1 AND user_id = $2'
            const res = await pool.query(query,[item_id,user_id])
            if (res.rows.length > 0){
                return {
                    success : true
                }

            }else{
          const likeQuery = "INSERT INTO likes (item_id, user_id) VALUES ($1, $2) RETURNING *;";
          const response = await pool.query(likeQuery, [item_id, user_id]);
          
          if (response.rows.length > 0) {
            return {
              success: true,
              id: response.rows[0].id 
            };
          } else {
            return {
              success: false,
              message: "Failed to insert like"
            };
          }
        }
        } catch (error) {
          console.error('Error while inserting like:', error);
          return {
            success: false,
            message: "Something went wrong"
          };
        }
      }

      async unlike (item_id,user_id){
        try {
            const query = 'DELETE FROM likes WHERE item_id = $1 AND user_id = $2';
            await pool.query(query,[item_id,user_id])
        }catch (error){
            console.error(error)
        }
      }

      async filter_feeds(category){
        const selectQuery = `
        SELECT 
            items.*, 
            users.name AS author, 
            users.avatar, 
            users.id AS author_id 
        FROM 
            items 
        JOIN 
            users 
        ON 
            items.author = users.id
        WHERE 
            items.subcategory  = $1;`;
    
        const feeds = await pool.query(selectQuery,[category])
        return feeds.rows
      }

      async get_user_likes(uuid){
        const query = 'SELECT item_id FROM likes WHERE user_id = $1'
        const likes = await pool.query(query,[uuid])
        return likes.rows
      }

      async create_comment (comment,item_id,user_id){
        try {
            const query = 'INSERT INTO comments (comment,item_id,user_id) VALUES ($1,$2,$3)'
            await pool.query(query,[comment,item_id,user_id])
        }catch (error){
            console.error(error)
        }
      }

      async get_my_liked_items(uuid){
        const query = `
        SELECT 
        l.user_id,
        l.item_id,
        b.*
    FROM 
        likes l
    JOIN 
        items b ON l.item_id = b.id
    WHERE 
        l.user_id = $1;
    
      `
      const res = await pool.query(query,[uuid])
      return res.rows
      }

      async update_user(name,value,uuid){
        try {
            const query =   `UPDATE users SET ${name} = $1 WHERE id = $2 `
            const res = await pool.query(query,[value,uuid])
            return res
        }catch(error){
        }
      }

      async delete_user(uuid){
        try {
            const query = "DELETE FROM users WHERE id = $1"
            await pool.query(query,[uuid])
            return {
                success: true
            }
        }catch(error){
            return {
                success : false,
                error : error
            }
        }
      }

      async delete_items(item_name,item_id) {
        try {
            const deleteQuery = `DELETE FROM ${item_name} WHERE id = $1`;
            const response = await pool.query(deleteQuery, [item_id]);
            return {
                success: true

            }
        } catch (error) {
            return {
                success: error,
                message: "Something went wrong"
            }
        }
    }
      
}



module.exports = Database