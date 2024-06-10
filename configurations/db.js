const mongoose = require("mongoose")

const connection = {};

const connectDB = async()=> {
	if (connection.isConnected) {
		return;
	}

    try {
        mongoose.set("strictQuery", false)
        const conn = await mongoose.connect(process.env.ATLAS_URI, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // useCreateIndex: true,
            // useFindAndModify: false
        })

		connection.isConnected = conn.connections[0].readyState;
        console.log(`MongoDB connected: ${conn.connection.host}`)
    } catch(error) {
        console.log(`Error occured during connection: ${error}`)
        process.exit(1)
    }
}

module.exports = connectDB