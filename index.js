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

        app.get('/campaigns', async (req, res) => {
            try {
                const campaigns = await campaignsCollection.find().toArray();
                res.status(200).json(campaigns);
            } catch (error) {
                console.error('Error fetching campaigns:', error);
                res.status(500).json({ message: 'Failed to fetch campaigns', error: error.message });
            }
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

        app.put('/campaigns/:id', async (req, res) => {
            const { id } = req.params;
            const { image, title, type, description, minDonation, deadline } = req.body;
        
            try {
                const updatedCampaign = {
                    $set: {
                        image,
                        title,
                        type,
                        description,
                        minDonation,
                        deadline: new Date(deadline),
                    },
                };
        
                const result = await campaignsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    updatedCampaign
                );
        
                if (result.modifiedCount === 0) {
                    return res.status(404).json({ message: 'Campaign not found or not updated' });
                }
        
                res.status(200).json({ message: 'Campaign updated successfully' });
            } catch (error) {
                console.error('Error updating campaign:', error);
                res.status(500).json({ message: 'Failed to update campaign', error: error.message });
            }
        });
        

        app.delete('/campaigns/:id', async (req, res) => {
            const { id } = req.params;
        
            try {
                const result = await campaignsCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 1) {
                    res.status(200).json({ message: 'Campaign deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Campaign not found' });
                }
            } catch (error) {
                console.error('Error deleting campaign:', error);
                res.status(500).json({ message: 'Failed to delete campaign', error: error.message });
            }
        });
        

        app.get('/myCampaigns', async (req, res) => {
            const userEmail = req.query.email;
        
            try {
                const userCampaigns = await campaignsCollection.find({ userEmail }).toArray();
                res.status(200).json(userCampaigns);
            } catch (error) {
                console.error('Error fetching user campaigns:', error);
                res.status(500).json({ message: 'Failed to fetch your campaigns', error: error.message });
            }
        });
        
        // -------------donation collection------------
        app.post("/donation", async (req, res) => {
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

        app.get('/myDonations', async (req, res) => {
            const userEmail = req.query.email;
        
            try {
                const donations = await donatedCollection.find({ userEmail }).toArray();
        
                if (!donations.length) {
                    return res.status(404).json({ message: 'No donations found' });
                }
        
                
                const campaignIds = donations.map(donation => new ObjectId(donation.campaignId));
                const campaigns = await campaignsCollection.find({ _id: { $in: campaignIds } }).toArray();
        
                // Merge donation data with campaign details
                const mergedData = donations.map(donation => {
                    
                    const campaign = campaigns.find(camp => camp._id.toString() === donation.campaignId.toString());
                    
                    console.log(campaigns);
                    return {
                        donationId: donation._id,
                        donatedAt: donation.donatedAt,
                        userName: donation.userName,
                        campaignTitle: campaign ? campaign.title : 'Campaign not found',
                        amount: campaign ? campaign.
                        minDonation
                         : 'N/A',
                        image: campaign ? campaign.image : 'N/A',
                    };
                });
                
                res.status(200).json(mergedData);
            } catch (error) {
                console.error('Error fetching donations:', error);
                res.status(500).json({ message: 'Failed to fetch donations', error: error.message });
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
