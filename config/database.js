const mongoose = require("mongoose");

const connectDb = async ()=>{
    try{
        console.log('MongoDb Connecting.....');
       await mongoose.connect(process.env.MongoDB_URL)

        console.log('Connected successfully');

    } catch(err){
        console.log("mongoDb connection failed",err.message);
         process.exit(1);
    }
}
module.exports = connectDb;