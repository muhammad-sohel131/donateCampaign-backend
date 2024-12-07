const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jd7el.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        const database = client.db('donationCamp');
        const campaignsCollection = database.collection('campaigns');
        const donatedCollection = database.collection('donated');

        // Helper Function to Handle Errors
        const handleError = (res, error, message) => {
            console.error(message, error);
            res.status(500).json({ message, error: error.message });
        };

        // Campaigns API
        app.get('/campaigns', async (req, res) => {
            try {
                const campaigns = await campaignsCollection.find().toArray();
                res.status(200).json(campaigns);
            } catch (error) {
                handleError(res, error, 'Failed to fetch campaigns');
            }
        });

        app.post('/campaigns', async (req, res) => {
            const { image, title, type, description, minDonation, deadline, userEmail, userName } = req.body;

            if (!image || !title || !type || !description || !minDonation || !deadline || !userEmail || !userName) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            try {
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
                handleError(res, error, 'Error adding campaign');
            }
        });

        app.get('/campaign/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const campaign = await campaignsCollection.findOne({ _id: new ObjectId(id) });
                if (campaign) {
                    res.json(campaign);
                } else {
                    res.status(404).json({ message: 'Campaign not found' });
                }
            } catch (error) {
                handleError(res, error, 'Error fetching campaign');
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
                const result = await campaignsCollection.updateOne({ _id: new ObjectId(id) }, updatedCampaign);
                if (result.modifiedCount === 0) {
                    return res.status(404).json({ message: 'Campaign not found or not updated' });
                }
                res.status(200).json({ message: 'Campaign updated successfully' });
            } catch (error) {
                handleError(res, error, 'Error updating campaign');
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
                handleError(res, error, 'Error deleting campaign');
            }
        });

        app.get('/myCampaigns', async (req, res) => {
            const userEmail = req.query.email;
            try {
                const userCampaigns = await campaignsCollection.find({ userEmail }).toArray();
                res.status(200).json(userCampaigns);
            } catch (error) {
                handleError(res, error, 'Failed to fetch your campaigns');
            }
        });

        // Donations API
        app.post('/donation', async (req, res) => {
            const { campaignId, userEmail, userName } = req.body;

            if (!campaignId || !userEmail || !userName) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            try {
                const donation = {
                    campaignId: new ObjectId(campaignId),
                    userEmail,
                    userName,
                    donatedAt: new Date(),
                };
                const result = await donatedCollection.insertOne(donation);
                res.status(201).json({ message: 'Donation successful', donationId: result.insertedId });
            } catch (error) {
                handleError(res, error, 'Error adding donation');
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

                const mergedData = donations.map(donation => {
                    const campaign = campaigns.find(camp => camp._id.toString() === donation.campaignId.toString());
                    return {
                        donationId: donation._id,
                        donatedAt: donation.donatedAt,
                        userName: donation.userName,
                        campaignTitle: campaign ? campaign.title : 'Campaign not found',
                        amount: campaign ? campaign.minDonation : 'N/A',
                        image: campaign ? campaign.image : 'N/A',
                    };
                });

                res.status(200).json(mergedData);
            } catch (error) {
                handleError(res, error, 'Failed to fetch donations');
            }
        });

        app.get('/running', async (req, res) => {
            try {
                const campaigns = await campaignsCollection
                    .find({ deadline: { $gte: new Date() } })
                    .limit(6)
                    .toArray();
                res.status(200).json(campaigns);
            } catch (error) {
                handleError(res, error, 'Failed to fetch running campaigns');
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
    console.log('Server is running at port ' + port);
});
