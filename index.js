const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(cors());

// Firebase Admin Initialization
const serviceAccount = require("./asset-verse.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.g6tkuix.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Firebase Token Verification Middleware
const verifyFToken = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    // console.log(decoded)
    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    res.status(401).send({ message: "Unauthorized access" });
  }
};

// ##############################
// ######### MAIN RUN ###########
// ##############################

async function run() {
  try {
    await client.connect();

    const database = client.db("Asset_verse_db");
    const usersCollection = database.collection("users");
    const assetCollection = database.collection("assets");
    const requestCollection = database.collection("requests");

    /* =============================
       🔹 USERS API
    ============================== */

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        // Check existing user
        const exists = await usersCollection.findOne({
          email: user.managerEmail || user.employeeEmail,
        });

        if (exists) {
          return res.status(409).send({
            success: false,
            message: "User already exists",
          });
        }

        // Common fields
        user.createdAt = new Date();
        user.updatedAt = new Date();

        if (user.role === "hr") {
          user.packageLimit = 5;
          user.currentEmployees = 0;
          user.subscription = "basic";
          user.email = user.managerEmail;
        }

        if (user.role === "employee") {
          user.email = user.employeeEmail;
        }

        const result = await usersCollection.insertOne(user);

        res.status(201).send({
          success: true,
          message: "User successfully created",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Get user role
    app.get("/users/role", async (req, res) => {
      try {
        const email = req.query.email;
        const result = await usersCollection.findOne({ email });
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });

    /* =============================
       🔹 ASSET API
    ============================== */

    app.post("/assets", verifyFToken, async (req, res) => {
      try {
         const hrEmail= req.decoded_email;
         const hrQuery={email:hrEmail,role:"hr"}
         const user=await usersCollection.findOne(hrQuery);
         if(!user){
            return res.status(400).send({
                success:false,
                message:"Hr not found "
            })
         }
        const asset = req.body;
      

        const newAsset = {
          productName: asset.productName,
          productImage: asset.productImage,
          productType: asset.productType,
          productQuantity: asset.productQuantity,

          availableQuantity: asset.productQuantity,
          dateAdded: new Date(), // auto time

          hrEmail: req.decoded_email, // token email
          companyName:user?.companyName,
        };

        const result = await assetCollection.insertOne(newAsset);

        res.status(201).send({
          success: true,
          message: "Asset added successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });

//    get assets for details pages 


    app.get("/assets/:id",verifyFToken,async(req,res)=>{
        try{
            const id=req.params.id;
        const query={_id:new ObjectId(id)}
        const result=await  assetCollection.findOne(query)
         res.send(result)
        }
        catch(error){
            res.status(500).send({
                success:false,
                message:"Internal server error "
            })

        }
    })
    // Asset get for hr asset list 
    app.get("/assets",verifyFToken,async(req,res)=>{
       try {
        
          const decoded_email = req.decoded_email;
         const hrEmail = req.query.email;
           const query = { hrEmail };
         let result=[]
         if( hrEmail ){
             if (hrEmail !== decoded_email) {
               return res.status(400).send({
                 success: false,
                 message: "Unauthorized accessed",
               });
             }
           
              result = await assetCollection.find(query).sort({dateAdded:-1}).toArray();
            

         }
           else{
             result = await assetCollection.find().sort({dateAdded:-1}).toArray();
           }

            res.status(200).send({
              success: true,
              message: "Asset get successfully",
              data: result,
            });

        
        
       } 
       
       catch (error) {
         res.status(500).send({
           success: false,
           message: "Internal server error",
         });
       }
       
    })

// <<<<<<< HEAD
//     // Ping MongoDB
// =======


//  { ******** Users Related Api ***************  }
 app.post("/users", async (req, res) => {
   try {
   
     const user = req.body;
     
    
     const exists = await usersCollection.findOne({ email:user.managerEmail||user.employeeEmail });
     if (exists) {
       return res.status(409).send({
         success: false,
         message: "User already exists",
       });
     }

    // common field 
      user.createdAt = new Date(); // UTC save
      user.updatedAt = new Date();
    if(user?.role==="hr"){
         user.packageLimit = 5;
         user.currentEmployees = 0;
         user.subscription = "basic";
         user.email=user.managerEmail;
  
    }
    if(user?.role==="employee"){
        user.email = user.employeeEmail;
    }
    
 ;
     const result = await usersCollection.insertOne(user);
   
     res.status(201).send({
       success: true,
       message: "User successfully created ",
       data: result,
     });
   } catch (error) {
     res.status(500).send({
       success: false,
       message: "Internal server error ",
     });
   }
 });
//  *****  Find user role ********   /// 
app.get("/users/role",async (req,res)=>{
    try {
      const email = req.query.email;
      const query = { email };
      const result = await usersCollection.findOne(query)
      res.send(result)
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Internal server error ",
      });
    }
})

// { ******* ASSet request related api ********* }
app.post("/requests", verifyFToken,async(req,res)=>{
   try {

     const requestAsset = req.body;
     requestAsset.requestDate=new Date()
     const result=await requestCollection.insertOne(requestAsset)
     res.status(200).send({
        success:true,
        message:"Request added successful",
        data:result
     })

   } 
   catch (error) {
     res.status(500).send({
       success: false,
       message: "Internal server error ",
     });
   }
})


//  ***** Asset get form hr ********   // 


 app.get("/requests", verifyFToken, async (req, res) => {
   try {
     const decoded_email = req.decoded_email;
     const hrEmail = req.query.email;
     const query = { hrEmail };
   
   
       if (hrEmail!== decoded_email) {
         return res.status(400).send({
           success: false,
           message: "Unauthorized accessed",
         });
       }

       result = await assetCollection
         .find(query)
         .sort({ dateAdded: -1 })
         .toArray();
      

     res.status(200).send({
       success: true,
       message: "Asset get successfully",
       data: result,
     });
   } catch (error) {
     res.status(500).send({
       success: false,
       message: "Internal server error",
     });
   }
 });

    // Send a ping to confirm a successful connection
//  (create rolebsed api for find role)
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
    //
  }
}

run().catch(console.dir);

// Default Route
app.get("/", (req, res) => {
  res.send("Asset server is running");
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
