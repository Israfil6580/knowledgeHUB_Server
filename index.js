const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");
// Middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://euphonious-centaur-a9c57b.netlify.app",
  ], // Update with your production URL
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster10.auxiczs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster10`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const userCollection = client.db("knowledgeHUB").collection("users");
    const sessionCollection = client
      .db("knowledgeHUB")
      .collection("Created_Sesson");
    const materialCollection = client
      .db("knowledgeHUB")
      .collection("materialsCollection");
    const bookingCollection = client
      .db("knowledgeHUB")
      .collection("bookingCollection");
    const noteCollection = client
      .db("knowledgeHUB")
      .collection("noteCollection");

    // jwt

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // jwt

    app.get("/users", async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      try {
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res
            .status(400)
            .send({ message: "User already exists", insertedId: null });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send({ error: "Failed to create user" });
      }
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await userCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send({ error: "Failed to delete user" });
      }
    });

    app.get("/search/users", async (req, res) => {
      const { query } = req.query;
      try {
        const users = await userCollection
          .find({
            $or: [
              { name: { $regex: query, $options: "i" } },
              { email: { $regex: query, $options: "i" } },
            ],
          })
          .toArray();
        res.send(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      try {
        const user = await userCollection.findOne(query);
        const admin = user?.role === "Admin";
        res.send({ admin });
      } catch (error) {
        console.error("Error checking admin:", error);
        res.status(500).send({ error: "Failed to check admin status" });
      }
    });

    app.get("/users/tutor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      try {
        const user = await userCollection.findOne(query);
        const tutor = user?.role === "Tutor";
        res.send({ tutor });
      } catch (error) {
        console.error("Error checking tutor:", error);
        res.status(500).send({ error: "Failed to check tutor status" });
      }
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = { $set: { role: "Admin" } };
      try {
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating admin role:", error);
        res.status(500).send({ error: "Failed to update admin role" });
      }
    });

    app.patch("/users/tutor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = { $set: { role: "Tutor" } };
      try {
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating tutor role:", error);
        res.status(500).send({ error: "Failed to update tutor role" });
      }
    });

    app.get("/users/tutor", async (req, res) => {
      const query = { role: "Tutor" };
      try {
        const result = await userCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching tutors:", error);
        res.status(500).send({ error: "Failed to fetch tutors" });
      }
    });

    app.post("/Created_Session", async (req, res) => {
      const createdSession = req.body;
      try {
        const result = await sessionCollection.insertOne(createdSession);
        res.send(result);
      } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).send({ error: "Failed to create session" });
      }
    });

    app.get("/Created_Session", async (req, res) => {
      try {
        const result = await sessionCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).send({ error: "Failed to fetch sessions" });
      }
    });

    app.get("/Session", async (req, res) => {
      try {
        const query = { Status: { $in: ["Pending", "Approved"] } };
        const result = await sessionCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).send({ error: "Failed to fetch sessions" });
      }
    });

    app.put("/Created_Session/Make_Approve/:id", async (req, res) => {
      const id = req.params.id;
      const { amount } = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          Status: "Approved",
          RegistrationFee: amount,
        },
      };
      const options = { upsert: false };
      const result = await sessionCollection.updateOne(query, update, options);
      res.send(result);
    });

    app.put("/Created_Session/Make_Rejected/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          Status: "Rejected",
        },
      };
      const options = { upsert: false };
      const result = await sessionCollection.updateOne(query, update, options);
      res.send(result);
    });
    app.delete("/Created_Session/Make_Delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/Created_Session/approved", async (req, res) => {
      const query = { Status: "Approved" };
      try {
        const result = await sessionCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching approved sessions:", error);
        res.status(500).send({ error: "Failed to fetch approved sessions" });
      }
    });

    app.get("/Created_Session/approved/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email, Status: "Approved" };
      try {
        const result = await sessionCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching user's approved sessions:", error);
        res
          .status(500)
          .send({ error: "Failed to fetch user's approved sessions" });
      }
    });

    app.get("/Created_Session/pending/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email, Status: "Pending" };
      try {
        const result = await sessionCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching user's pending sessions:", error);
        res
          .status(500)
          .send({ error: "Failed to fetch user's pending sessions" });
      }
    });

    app.get("/Created_Session/rejected/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email, Status: "Rejected" };
      try {
        const result = await sessionCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching user's rejected sessions:", error);
        res
          .status(500)
          .send({ error: "Failed to fetch user's rejected sessions" });
      }
    });

    app.get("/session/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await sessionCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error fetching session:", error);
        res.status(500).send({ error: "Failed to fetch session" });
      }
    });

    app.post("/Study_Materials", async (req, res) => {
      const body = req.body;
      try {
        const result = await materialCollection.insertOne(body);
        res.send(result);
      } catch (error) {
        console.error("Error creating study material:", error);
        res.status(500).send({ error: "Failed to create study material" });
      }
    });

    app.get("/Study_Materials", async (req, res) => {
      try {
        const result = await materialCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching study materials:", error);
        res.status(500).send({ error: "Failed to fetch study materials" });
      }
    });
    app.delete("/Study_Material/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await materialCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error Deleting study materials:", error);
        res.status(500).send({ error: "Failed to Deleting study materials" });
      }
    });

    app.get("/Study_Materials/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email };
      try {
        const result = await materialCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching user's study materials:", error);
        res
          .status(500)
          .send({ error: "Failed to fetch user's study materials" });
      }
    });

    app.delete("/Study_Material/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await materialCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting study material:", error);
        res.status(500).send({ error: "Failed to delete study material" });
      }
    });

    app.patch("/Study-Material/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          MaterialTitle: data.MaterialTitle,
          PhotoURLs: data.PhotoURLs,
          GoogleDriveLinks: data.GoogleDriveLinks,
        },
      };
      try {
        const result = await materialCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating material:", error);
        res.status(500).send({ message: "Failed to update material" });
      }
    });

    app.post("/Booked_Session", async (req, res) => {
      const body = req.body;
      try {
        const result = await bookingCollection.insertOne(body);
        res.send(result);
      } catch (error) {
        console.error("Error booking session:", error);
        res.status(500).send({ error: "Failed to book session" });
      }
    });

    app.get("/Booked_Session/:email", async (req, res) => {
      const email = req.params.email;
      const query = { TutorEmail: email };
      try {
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching booked sessions:", error);
        res.status(500).send({ error: "Failed to fetch booked sessions" });
      }
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const priceInCents = parseFloat(price) * 100;
      if (!price || priceInCents < 1) {
        return res.status(400).send({ error: "Invalid price" });
      }
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: priceInCents,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({ error: "Failed to create payment intent" });
      }
    });

    app.post("/notes", async (req, res) => {
      const body = req.body;
      try {
        const result = await noteCollection.insertOne(body);
        res.send(result);
      } catch (error) {
        console.error("Error creating study note:", error);
        res.status(500).send({ error: "Failed to create study note" });
      }
    });

    app.get("/notes/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await noteCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.put("/notes/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { title, content } = req.body;
        const query = { _id: new ObjectId(id) };

        const result = await noteCollection.updateOne(query, {
          $set: { title, content }, // Use $set to update specific fields
        });

        if (result.modifiedCount === 0) {
          return res.status(404).json({ message: "Note not found" });
        }

        res.status(200).json({ message: "Note updated successfully" });
      } catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete("/notes/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const result = await noteCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Note not found" });
        }

        res.status(200).json({ message: "Note deleted successfully" });
      } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.get("/seeMaterials/:sessionId", async (req, res) => {
      const sessionId = req.params.sessionId;
      const query = { SessionId: sessionId };
      const a = await materialCollection.find(query).toArray();
      res.send(a);
    });
    app.put("/Created_Session/New_Request/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid ID format" });
      }

      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          Status: "Pending",
        },
      };
      const options = { upsert: false };

      try {
        const result = await sessionCollection.findOneAndUpdate(
          query,
          update,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating session status:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Express Route for fetching approved sessions with pagination
    app.get("/Created_Session/approved", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 6; // Default limit to 6 if not provided

      try {
        // Logic to fetch sessions from your database with pagination
        const sessions = await sessionCollection
          .find({ approved: true })
          .skip((page - 1) * limit)
          .limit(limit);

        res.json(sessions);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensuring client.close() is called after the operations are complete
    // await client.close();
  }
}

app.get("/", (req, res) => {
  res.send("Yeah, It's running!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

run().catch(console.dir);
