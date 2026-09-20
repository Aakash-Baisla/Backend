import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username,email
    // check for images,check for avatar
    // upload them to cloudinary,avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // rtegistering user
    // req.body contains form inputs sent by the client (JSON/Form Data)
    const{fullName, email,password,username} = req.body;
    console.log("email:",email)


    // / STEP 2: Validate required text fields
    // .some() returns true if AT LEAST ONE field fails the check.
    // optional chaining (?.) prevents crashing if a field is undefined.
    // .trim() removes leading/trailing spaces to stop whitespace-only values.
    if (
        [fullName, email,password,username].some((fields)=>
            fields?.trim() === "")
    ) {
        throw new ApiError(400,"All Fields are required")
    }

    // STEP 3: Check if the user already exists in MongoDB
    // CRITICAL FIX: User.findOne() is asynchronous and MUST be awaited.
    // Without 'await', existedUser returns a Promise (truthy object), 
    // which causes this error to throw every single time.
    // MongoDB $or query checks if either username OR email already exists.

    const existedUser = await User.findOne({ // find one is using because the only first value we get it maybe email or username
        $or: [{ username }, { email }]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    console.log(req.files)


    //  STEP 4: Access local file paths saved by Multer middleware
    // Multer saves uploaded files temporarily to disk (e.g., ./public/temp)
    // Optional chaining prevents 'TypeError: Cannot read properties of undefined'
    // if req.files or avatar/coverImage array is missing.
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    // Cover image is optional, so we handle cases where it might not be uploaded
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
        }



    // check for especially avatar
    // Avatar is mandatory for registration
    try {
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        return res.status(400).json({ message: "Cloudinary upload failed" });
    }
    } catch (error) {
    console.error("Cloudinary Error Details:", error);
    return res.status(500).json({ message: error.message });
    }


    // upload them to cloudinary,avatar
    // STEP 5: Upload local files to Cloudinary cloud storage
    // 'uploadOnCloudinary' transfers the local file to Cloudinary
    // and returns an object containing the secure hosted URL.
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // Only upload cover image if local path exists
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar Required")
    }

    // STEP 6: Save the new user document to MongoDB
    // User.create() instantiates a new document and runs Schema hooks
    // (e.g., pre-save hooks to hash passwords with bcrypt).
    // FIX TYPO: 'toLowerCase()' (capital 'C') instead of 'tolowerCase()'
    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url|| "",
        email,
        password,
        username: username.toLowerCase()
    })

    // STEP 7: Retrieve user without sensitive data
    // Fetch the newly created user and exclude sensitive fields using .select()
    // FIX SYNTAX: Separated by spaces without commas ("-password -refreshToken")
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    // STEP 8: Send structured success response to client
    // 201 Created status code indicates successful resource creation.
    // return response
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )
})

export {registerUser}




/**
 * ============================================================================
 * FILE: user.controller.js
 * ROLE: Controller Layer (Business Logic & Request Orchestration)
 * ============================================================================
 * 
 * WHAT IS A CONTROLLER?
 * - In Express / MVC architecture, controllers act as the "brain" of the app.
 * - Routes point requests HERE. Models get queried FROM HERE.
 * - Controllers process input, talk to the DB/services, and send responses.
 * 
 * ARCHITECTURAL FLOW:
 * Client Request ➔ Express Route ➔ Middleware (Multer/Auth) ➔ CONTROLLER ➔ DB / Cloud ➔ Client Response
 * 
 * CORE RESPONSIBILITIES OF THIS FILE:
 * 1. Extract Data: Read req.body (JSON/form data), req.files (Multer images), req.params/query.
 * 2. Validate Input: Ensure required fields exist, trim whitespaces, throw ApiError on bad data.
 * 3. Business Logic: Query Mongoose models (User.findOne, User.create), manage database ops.
 * 4. External Services: Delegate image uploads to Cloudinary (uploadOnCloudinary).
 * 5. Sanitize Output: Strip sensitive data (e.g., removing passwords & tokens from JSON).
 * 6. Standardize Response: Return consistent JSON payloads using ApiResponse & HTTP status codes.
 * 
 * HELPER UTILITIES USED:
 * - asyncHandler : Wraps async controllers to catch errors without repetitive try-catch blocks.
 * - ApiError     : Custom error class to throw structured HTTP error responses (e.g., 400, 404, 409).
 * - ApiResponse  : Custom class to wrap successful JSON output consistently.
 * ============================================================================
 */