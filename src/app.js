import express from 'express'
import cors from 'cors'
const app = express()
import cookieParser from 'cookie-parser'

app.use(cors({
    origin: process.env.CORS_ORIGIN, // Defines which frontend domain is allowed to make API requests to this server
    credentials: true // Allows the browser to send cookies, authorization headers, or TLS client certificates along with requests
}));


app.use(express.json({ limit: "16kb" })); // Allows JSON data in request body; protects server from huge payloads
app.use(express.urlencoded(
    { extended: true, limit: "16kb" })); // Decodes URL formatting from browser forms; supports nested objects
app.use(express.static("public")); // Exposes a folder to serve assets (images, PDFs) directly to the web
app.use(cookieParser()); // Parses browser cookies into req.cookies; used for secure JWT auth



// routes import
import useRouter from "./routes/user.routes.js"


// routes declaration
app.use("/api/v1/users",useRouter)

export {app}