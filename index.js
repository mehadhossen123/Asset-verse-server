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
    const assignedAssetCollection = database.collection("assignedAssets");
   
    const employeeAffiliationsCollection = database.collection("affiliations");
    const packagesCollection = database.collection("packages");

    /* =============================
       🔹 ASSIGNED ASSETS RELATED  API
    ============================== */

app.get("/assignedAssets/uniqueCompany", async (req, res) => {
  try {
    const companyName = await assignedAssetCollection.aggregate([
     {
      $group:{_id:{$toLower:"$companyName"}}
     },{
      $project:{_id:0,companyName:"$_id"}

     }

    ]).toArray()
    res.status(200).send({
      success: true,
      message: "Successful ",
      data:companyName,
    });
  } catch (error) {
    console.log(error)
    res.status(500).send({
      success: false,
      message: "Internal server error ",
    });
  }
});
    /* =============================
       🔹 USERS API
    ============================== */

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        const exists = await usersCollection.findOne({
          email: user.managerEmail || user.employeeEmail,
        });

        if (exists) {
          return res.status(409).send({
            success: false,
            message: "User already exists",
          });
        }

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

    app.get("/users/role", async (req, res) => {
      try {
        const email = req.query.email;
        const result = await usersCollection.findOne({ email });
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });

    /* =============================
       🔹 ASSET API
    ============================== */

    app.post("/assets", verifyFToken, async (req, res) => {
      try {
        const hrEmail = req.decoded_email;
        const hrQuery = { email: hrEmail, role: "hr" };
        const user = await usersCollection.findOne(hrQuery);

        if (!user) {
          return res.status(400).send({
            success: false,
            message: "Hr not found ",
          });
        }

        const asset = req.body;

        const newAsset = {
          productName: asset.productName,
          productImage: asset.productImage,
          productType: asset.productType,
          productQuantity: asset.productQuantity,
          availableQuantity: parseInt(asset.productQuantity),
          dateAdded: new Date(),
          hrEmail: req.decoded_email,
          companyName: user?.companyName,
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

    app.get("/assets/:id", verifyFToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await assetCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });

    // app.get("/assets", verifyFToken, async (req, res) => {
    //   try {
    //     const decoded_email = req.decoded_email;
    //     const userEmail = req.query.email;
    //     const query = {  };

    //     const searchText=req.query.searchText

    //     if (userEmail) {
    //       if (userEmail !== decoded_email) {
    //         return res.status(400).send({
    //           success: false,
    //           message: "Unauthorized accessed",
    //         });
    //       }

    //       if(searchText){
    //         query.productName = { $regex: searchText, $options: "i" };
    //       }

    //       result = await assetCollection
    //         .find(query)
    //         .sort({ dateAdded: -1 })
    //         .toArray();
    //     }
    //     else {
    //       result = await assetCollection
    //         .find()
    //         .sort({ dateAdded: -1 }).limit(8)
    //         .toArray();
    //     }

    //     res.status(200).send({
    //       success: true,
    //       message: "Asset get successfully",
    //       data: result,
    //     });
    //   } catch (error) {
    //     res.status(500).send({
    //       success: false,
    //       message: "Internal server error",
    //     });
    //   }
    // });

    app.get("/assets", async (req, res) => {
      try {
        const { limit = 0, skip = 0, search } = req.query;
        console.log(search);

        const query = {};
        if (search) {
          query.productName = { $regex: search, $options: "i" };
        }
        const result = await assetCollection
          .find(query)
          .sort({ dateAdded: -1 })
          .limit(Number(limit))
          .skip(Number(skip))
          .toArray();
        const count = await assetCollection.countDocuments(query);

        res.status(200).send({
          success: true,
          message: "Assets fetched successfully",

          data: result,
          total: count,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });

    app.patch("/assets/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const updatedBody = req.body;
        const updatedDoc = {
          $set: updatedBody,
        };
        const result = await assetCollection.updateOne(query, updatedDoc);
        res.status(200).send({
          success: true,
          message: "Asset Edit Successful",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });

    app.delete("/assets/:id", verifyFToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await assetCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.status(200).send({
          success: true,
          message: "Asset Deleted",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });

    // { ******* ASSet request related api ********* }

    app.post("/requests", verifyFToken, async (req, res) => {
      try {
        const requestAsset = req.body;
        requestAsset.requestDate = new Date();
        const result = await requestCollection.insertOne(requestAsset);
        res.status(200).send({
          success: true,
          message: "Request added successful",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });

    app.get("/requests", verifyFToken, async (req, res) => {
      try {
        const decoded_email = req.decoded_email;
        const hrEmail = req.query.email;
        const query = { hrEmail };

        if (hrEmail !== decoded_email) {
          return res.status(400).send({
            success: false,
            message: "Unauthorized accessed",
          });
        }

        const result = await requestCollection
          .find(query)
          .sort({ dateAdded: -1, requestDate: -1 })
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

    // APPROVE API
    app.patch("/requests/approve/:id", verifyFToken, async (req, res) => {
      try {
        const assetId = req.params.id;

        const processedByEmail = req.decoded_email;

        const approvedAsset = await requestCollection.findOne({
          assetId: assetId,
        });

        if (!approvedAsset) {
          return res.status(404).send({
            success: false,
            message: "Requested asset not found ",
          });
        }
        if (approvedAsset.requestStatus === "approved") {
          return res.status(400).send({
            success: false,
            message: "Requested asset already approved ",
          });
        }

        const hrUser = await usersCollection.findOne({
          email: processedByEmail,
        });

        const asset = await assetCollection.findOne({
          _id: new ObjectId(assetId),
        });

        if (!asset || asset?.availableQuantity <= 0) {
          return res.status(404).send({
            success: false,
            message: "Asset out of stock ",
          });
        }

        if (hrUser.packageLimit <= hrUser.currentEmployees) {
          return res.status(404).send({
            success: false,
            message: "Your package is reached .Please upgrade your package ",
          });
        }

        const assignedAsset = {
          assetId: approvedAsset.assetId,
          assetName: approvedAsset.assetName,
          assetImage: approvedAsset.assetImage,
          assetType: approvedAsset.assetType,
          employeeEmail: approvedAsset.requesterEmail,
          employeeName: approvedAsset.requesterName,
          hrEmail: processedByEmail,
          companyName: approvedAsset.companyName,
          assignmentDate: new Date(),
          returnDate: null,
          status: "assigned",
        };

        await assetCollection.updateOne(
          { _id: new ObjectId(assetId) },
          { $inc: { availableQuantity: -1 } }
        );

        await assignedAssetCollection.insertOne(assignedAsset);

        const requestedAssetUpdateInfo = {
          $set: {
            requestStatus: "approved",
            approvedDate: new Date(),
            processedBy: processedByEmail,
          },
        };

        await requestCollection.updateOne(
          { assetId: assetId },
          requestedAssetUpdateInfo
        );

        const affiliation = await employeeAffiliationsCollection.findOne({
          employeeEmail: approvedAsset.requesterEmail,
          processedByEmail,
        });

        if (!affiliation) {
          const affiliationInfo = {
            employeeEmail: approvedAsset.requesterEmail,
            employeeName: approvedAsset.requesterName,

            hrEmail: processedByEmail,
            companyName: approvedAsset.companyName,
            companyLogo: hrUser.companyLogo,
            affiliationDate: new Date(),
            status: "active",
          };
          await employeeAffiliationsCollection.insertOne(affiliationInfo);

          await usersCollection.updateOne(
            { email: processedByEmail },
            {
              $inc: {
                currentEmployees: 1,
              },
            }
          );
        }

        res.status(200).send({
          success: true,
          message: "Asset approved successfully ",
          data: assignedAsset,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });
    app.delete("/requests/:id", verifyFToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await requestCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.status(200).send({
          success: true,
          message: "Asset Deleted",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });
    // assigned asset related api .???? ///////

    app.get("/requests/asset", verifyFToken, async (req, res) => {
      try {
        searchText = req.query.searchText;
        const decoded_email = req.decoded_email;
        const userEmail = req.query.email;
        const status = req.query.requestStatus;

        const query = {
          requesterEmail: userEmail,
          requestStatus: status,
        };

        if (userEmail !== decoded_email) {
          return res.status(400).send({
            success: false,
            message: "Unauthorized accessed",
          });
        }

        if (searchText) {
          query.assetName = { $regex: searchText, $options: "i" };
        }

        const result = await requestCollection
          .find(query)
          .sort({
            approvedDate: -1,
          })
          .toArray();

        res.status(200).send({
          success: true,
          message: "Asset get successfully",
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });

    //  Payment related api is here /
    //
    //

    app.get("/packages", async (req, res) => {
      try {
        const result = await packagesCollection.find().toArray();
        res.status(200).send({
          success: true,
          message: "Data get successful ",
          data: result,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message: "Internal server error ",
        });
      }
    });

    //  Affiliation related api

    app.get("/affiliations", verifyFToken, async (req, res) => {
      try {
        searchText = req.query.searchText;
        const decoded_email = req.decoded_email;
        const userEmail = req.query.email;

        const query = {
          hrEmail: userEmail,
        };

        if (userEmail !== decoded_email) {
          return res.status(400).send({
            success: false,
            message: "Unauthorized accessed",
          });
        }

        if (searchText) {
          query.employeeName = { $regex: searchText, $options: "i" };
        }

        const result = await employeeAffiliationsCollection
          .find(query)
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

    //  Delete employee
    app.delete("/affiliations/:id", verifyFToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await employeeAffiliationsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
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
