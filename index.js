const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster10.auxiczs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster10`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("knowledgeHUB").collection("users");
    const sessionCollection = client
      .db("knowledgeHUB")
      .collection("Created_Sesson");
    const materialCollection = client
      .db("knowledgeHUB")
      .collection("materialsCollection");

    app.get("/users", async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists:
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // delete user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // search api
    app.get("/search/users", async (req, res) => {
      const { query } = req.query;
      try {
        const users = await userCollection
          .find({
            $or: [
              { name: { $regex: query, $options: "i" } }, // Search name case-insensitively
              { email: { $regex: query, $options: "i" } }, // Search email case-insensitively
            ],
          })
          .toArray(); // Convert cursor to array
        res.json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      //   if (email !== req.decoded.email) {
      //     return res.status(403).send({ message: "forbidden access" });
      //   }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "Admin";
      }
      res.send({ admin });
    });

    app.get("/users/tutor/:email", async (req, res) => {
      const email = req.params.email;

      //   if (email !== req.decoded.email) {
      //     return res.status(403).send({ message: "forbidden access" });
      //   }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let tutor = false;
      if (user) {
        tutor = user?.role === "Tutor";
      }
      res.send({ tutor });
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "Admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.patch("/users/tutor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "Tutor",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // update session

    app.post("/Created_Session", async (req, res) => {
      const CreatedSession = req.body;
      const result = await sessionCollection.insertOne(CreatedSession);
      res.send(result);
    });

    // load created session

    app.get("/Created_Session", async (req, res) => {
      const loadedSession = await sessionCollection.find().toArray();
      res.send(loadedSession);
    });
    // approved session specific user
    app.get("/Created_Session/approved/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email, Status: "Approved" };
      const result = await sessionCollection.find(query).toArray();
      res.send(result);
    });
    // pending session specific user
    app.get("/Created_Session/pending/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email, Status: "Pending" };
      const result = await sessionCollection.find(query).toArray();
      res.send(result);
    });
    // rejected session specific user
    app.get("/Created_Session/rejected/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email, Status: "Rejected" };
      const result = await sessionCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/Study_Materials", async (req, res) => {
      const body = req.body;
      try {
        const result = await materialCollection.insertOne(body); // Use insertOne for a single document
        res.send(result);
      } catch (error) {
        console.error("Error updating study materials:", error);
      }
    });

    // load user materials
    app.get("/Study_Materials", async (req, res) => {
      try {
        const result = await materialCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error retrieving study materials:", error);
      }
    });

    // find user materials
    app.get("/Study_Materials/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { TutorEmail: email };
        const result = await materialCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error.message);
      }
    });
    // everything in this try
    // await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
app.get("/", (req, res) => {
  res.send("Yeah, It's running!");
});
app.listen(port, () => {
  console.log(`port running on ${port}`);
});
run().catch(console.dir);
