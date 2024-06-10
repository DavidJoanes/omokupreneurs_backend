const express = require("express")
const morgan = require("morgan")
const cors = require("cors")
const passport = require("passport")
// const bodyParser = require("body-parser")
const connectDB = require("./configurations/db")
const routes = require("./middlewares/routes")
require("dotenv").config();

connectDB()

const app =  express()
if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}else {    
    app.use(morgan('combined'))
}

app.use(cors())
// app.use(bodyParser.urlencoded({extended: false}))
// app.use(bodyParser.json({limit: '20mb'}))
app.use(express.json({limit: '20mb'}))
app.use(express.urlencoded({limit: '20mb', extended: true, parameterLimit: 10000}))
app.use(express.static("./public"))
app.use(routes)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
app.use(passport.initialize())
require("./configurations/passport")(passport)

const PORT = process.env.PORT || 2001
app.listen(PORT, console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`))