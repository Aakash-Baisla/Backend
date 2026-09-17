// require ('dotenv').config({path: './env'})
import dotenv from 'dotenv'
import connectDB from './db/index.js'
import { app } from './app.js'
dotenv.config({
    path:'./.env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at port ${process.env.PORT || 8000}`)
    })
})
.catch((error)=>{
    console.log("MONGODB Connection failed !!!" , error)
})

























/*
// BASIC APPROACH
import express from "express"
const app = express();
// Database Connection established throw IIFE
// two points to remember use async and await -> database is in another continent
// 2. database give error so use try and catch always 
(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",error =>{
            console.log("ERRR: ", error)
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`APP is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERROR",error)
        throw err
    }
})() 
*/