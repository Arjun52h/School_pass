const express = require("express");
const cors = require("cors"); // used to communicate react with backend

const mongoose = require("mongoose");
require("dotenv").config();

const pickuppassroute = require("./routes/Pickuproutes")
const app =express();
app.use(cors());
app.use(express.json());

app.use("/api/passes" , pickuppassroute);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected Successfully");
    })
    .catch((error) => {
        console.log("MongoDB connection Failed:",error);
        
    })

app.get("/" , (req,res)=>{
    res.json({
        message: "School api running !"
    });
});

const PORT = 5000;


app.listen(PORT, () =>{
    console.log(`Server is Running on Port http://localhost:${PORT}`);
    
});