const postController = require("../controllers/Pages/postController");
const pageController = require("../controllers/Pages/PagesController");
const PostActionController= require('../controllers/Pages/PostActionController')
const Page= require('../models/Pages/PagesModel')
const express = require("express");
const router = express.Router();
const userAuthMiddleware = require('../middlewares/userAuthMiddleware');
const {uploadAvatarMulter}=require('../middlewares/multer')

const {uploadPostMedia} = require("../middlewares/multer");

router.post("/page/createpost", uploadPostMedia,userAuthMiddleware, postController.createPost);
router.post("/page/createcadpost", uploadPostMedia,userAuthMiddleware, postController.createCadPost);
router.get("/page/getposts/:pageId",userAuthMiddleware, postController.getPosts);
router.get("/page/getpostbyid/:postId",userAuthMiddleware, postController.getPostById);

router.get("/page/getallpost", userAuthMiddleware,postController.getAllPosts);
router.patch("/page/updatepost", uploadPostMedia,userAuthMiddleware, postController.updatePost);
router.delete("/page/deletepost/:postId",userAuthMiddleware, postController.deletePost);
router.get("/page/alldeletepost/:pageId",userAuthMiddleware, postController.getAllDeletedPosts);

router.get("/page/getallvisiofeeds", userAuthMiddleware,postController.getCombinedPosts);



//savePost

router.get('/page/savepost/:pageId/:saveId',userAuthMiddleware,PostActionController.savePost)
router.get('/page/allsavedpost/:pageId',userAuthMiddleware,PostActionController.allSavedPost)
router.get('/page/archivepost/:postId',userAuthMiddleware,PostActionController.archivePost)
router.get('/page/allarchivedpost/:pageId',userAuthMiddleware,PostActionController.allArchivedPost)
router.get('/page/pinpost/:postId',userAuthMiddleware,PostActionController.setToPin)

router.get('/page/like/:postId/:userPageId',userAuthMiddleware,PostActionController.actionLike)




//report pagepost
router.post('/page/reportpagepost',userAuthMiddleware,pageController.reportpagePost)
//report page
router.post('/page/reportpage',userAuthMiddleware,pageController.reportpage)


//avatar allpageavatars
router.get('/pages/getallavatarpage/:pageId',userAuthMiddleware, pageController.getAllAvatar)
router.post('/pages/upload-customavatar',userAuthMiddleware,uploadAvatarMulter, pageController.addCustomAvatar)

router.post("/add-fields-to-documents", async (req, res) => {
      try {
        // Fields to check and add with default values
        const defaultFields = {
          date_of_birth: '1995-08-15', // Default value for date_of_birth
          gender: "male", // Default value for gender
        };
    
        // Update documents to include missing fields
        const result = await Page.updateMany(
            { date_of_birth: { $exists: false } }, // Match documents where the field does not exist
            { $set: { date_of_birth: "1995-08-15", gender: "Male" } }, // Add the missing fields with default values
            { multi: true } // Update multiple documents
          );
          
        res.status(200).json({
          message: "Fields added to documents (if missing).",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("Error updating documents:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
module.exports = router;
