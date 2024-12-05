const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jd7el.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected!");

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db('donationCamp');
        const campaignsCollection = database.collection('campaigns');
        const donatedCollection = database.collection('donated');

        // Define your routes
        app.get("/campaigns", async (req, res) => {
            const campaigns = await campaignsCollection.find({}).toArray();
            res.json(campaigns);
        });

        app.post("/campaigns", async (req, res) => {
            try {
                const { image, title, type, description, minDonation, deadline, userEmail, userName } = req.body;

                if (!image || !title || !type || !description || !minDonation || !deadline || !userEmail || !userName) {
                    return res.status(400).json({ message: 'All fields are required' });
                }

                const newCampaign = {
                    image,
                    title,
                    type,
                    description,
                    minDonation,
                    deadline: new Date(deadline),
                    userEmail,
                    userName,
                };

                const result = await campaignsCollection.insertOne(newCampaign);
                res.status(201).json({ message: 'Campaign added successfully', campaignId: result.insertedId });
            } catch (error) {
                console.error('Error adding campaign:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        app.get("/campaigns/:id", async (req, res) => {
            const id = req.params.id;
            
            try {
                const campaign = await campaignsCollection.findOne({ _id: new ObjectId(id) });
                if (campaign) {
                    res.json(campaign);
                } else {
                    res.status(404).json({ message: 'Campaign not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        app.put("/campaigns/:id", async (req, res) => {
            const id = req.params.id;
            res.send(id); // To be implemented with MongoDB update query
        });

        app.delete("/campaigns/:id", async (req, res) => {
            const id = req.params.id;
            res.send(id); // To be implemented with MongoDB delete query
        });

        // -------------donation collection------------
        app.post("/donate", async (req, res) => {
            const { campaignId, userEmail, userName } = req.body;

            if (!campaignId || !userEmail || !userName) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            const donation = {
                campaignId: new ObjectId(campaignId),
                userEmail,
                userName,
                donatedAt: new Date(),
            };

            try {
                const result = await donatedCollection.insertOne(donation);
                res.status(201).json({ message: 'Donation successful', donationId: result.insertedId });
            } catch (error) {
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.listen(port, () => {
    console.log("Server is running at port " + port);
});
