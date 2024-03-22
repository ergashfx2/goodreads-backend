const pool = require("../config/db")
let crypto = require("crypto");
const { use } = require("../routes");


class Database {

    async select_user(email) {
        const selectQuery = 'SELECT * FROM users WHERE email = $1';
        const selectResult = await pool.query(selectQuery, [email]);

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
        } catch (error) {
            return { success: false };
        }
    }


    async create_collection(name, user_id) {
        try {
            const insertQuery = 'INSERT INTO collections (collection_name, user_id) VALUES ($1, $2)';
            const res = await pool.query(insertQuery, [name, user_id]);
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


    async select_collection_books(collection_id) {
        const selectQuery = "SELECT * FROM books WHERE collection = $1"
        const response = await pool.query(selectQuery, [collection_id])
        return response.rows
    }

    async delete_collections(uuid, collectionNames) {
        try {
            const deleteQuery = "DELETE FROM collections WHERE user_id = $1 AND collection_name = ANY($2)";
            const response = await pool.query(deleteQuery, [uuid, collectionNames]);
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

    async create_book(title, description, category, subcategory, author, tags, image, collection) {
        try {
            const insertQuery = 'INSERT INTO books (title, description,category,subcategory,author,tags,image,collection) VALUES ($1, $2,$3,$4,$5,$6,$7,$8)';
            const res = await pool.query(insertQuery, [title, description, category, subcategory, author, tags, image, collection]);
            if (res.rowCount > 0) {

                return {
                    success: true,
                }
            }
        } catch (error) {
            return { success: error };
        }
    }


    async get_book_detail(book_id) {
        const selectQuery = "SELECT b.*, u.name FROM books b JOIN users u ON b.author = u.id WHERE b.id = $1;"
        const response = await pool.query(selectQuery, [book_id])
        return response.rows
    }

    async get_feeds() {
            const selectQuery = 'SELECT books.*, users.name AS author, users.avatar,users.id AS author_id FROM books JOIN users ON books.author = users.id;'
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
                    FROM books
                    WHERE author = u.id
                ) AS books
            ) AS user_books
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
                console.log(response.rows)
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
            console.log(error);
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
            console.log(error);
            return {
                success: false,
                message: "Error updating user image"
            };
        }

    }

    async like(book_id, user_id) {
        try {
          const likeQuery = "INSERT INTO likes (book_id, user_id) VALUES ($1, $2) RETURNING *;";
          const response = await pool.query(likeQuery, [book_id, user_id]);
          
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
        } catch (error) {
          console.error('Error while inserting like:', error);
          return {
            success: false,
            message: "Something went wrong"
          };
        }
      }
      
}

module.exports = Database