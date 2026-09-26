import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async(userId)=>{
    // ==============================================================================
// 💡 THE SOUL OF THIS FUNCTION (IN PLAIN ENGLISH)
// This is your token factory. When a user successfully logs in, this function:
// 1. Fetches their account using their unique User ID.
// 2. Prints two secure digital keys: an Access Token and a Refresh Token.
// 3. Saves the Refresh Token inside the database so the backend can recognize it later.
//
// 🎫 ACCESS TOKEN (The Temporary Key):
// -> A short-lived key (expires in 15–30 mins) sent with every single API request.
// -> Proves to the server that the user is logged in right now.
//
// 📑 REFRESH TOKEN (The Master Key):
// -> A long-lived key (lasts weeks/months) kept safely hidden away on the client.
// -> Used exclusively behind the scenes to ask for a new Access Token once it dies.
// ==============================================================================

    try {
        const user = await User.findById(userId)   
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}
         
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating acces and refresh Token ")
    }
}

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


        // NOTE: Deleted the previous validation try-catch block here because it called 
// uploadOnCloudinary() prematurely. Since our updated Cloudinary utility deletes 
// the local file instantly using fs.unlinkSync(), a second call down in Step 5 
// would look for a missing file and throw a false "Avatar Required" (ENOENT) error.

    // check for especially avatar
    // Avatar is mandatory for registration
    // try {
    // const avatar = await uploadOnCloudinary(avatarLocalPath);
    // if (!avatar) {
    //     return res.status(400).json({ message: "Cloudinary upload failed" });
    // }
    // } catch (error) {
    // console.error("Cloudinary Error Details:", error);
    // return res.status(500).json({ message: error.message });
    // }


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

const loginUser = asyncHandler(async(req,res)=>{
    // 1. EXTRACT DATA FROM REQUEST BODY
    // 2. FIND THE USER IN THE DATABASE
    // 3. CHECK THE PASSWORD
    // 4. GENERATE ACCESS AND REFRESH TOKENS
    // 5. DEFINE SECURE COOKIE OPTIONS
    // 6. SEND SECURE COOKIES AND JSON RESPONSE

 // 1. EXTRACT CREDENTIALS FROM THE FRONTEND REQUEST
    // -> Use destructuring to pull email, password, and username out of req.body.
    const{email, password,username} = req.body

    // 2. VALIDATE MANDATORY FIELDS ARE NOT EMPTY
    // -> Check if BOTH the email and username are missing from the request.
    // -> If both are empty, stop execution immediately and throw a 400 Bad Request error.
    if(!(email || username)){
        throw new ApiError(400,"username or email is required")
    }

    // 3. SEARCH DATABASE FOR THE EXISTING USER
    // -> Query the database using the '$or' operator to find a record.
    // -> It looks for a document that matches EITHER the provided email OR the provided username.
    const user = await User.findOne({
        $or: [{email},{username}]
    })

    // 4. VERIFY IF THE USER ACUALLY EXISTS
    // -> Check if the database query returned null (no user found).
    // -> If no user exists with that email/username, throw a 404 Not Found error.
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    // 5. COMPARE AND VALIDATE THE PASSWORD
    // -> Call the custom model method 'isPasswordCorrect' to compare the plain text password with the hashed database password.
    // -> This step handles the decryption/comparison process behind the scenes.
    const isPasswordValid = await user.isPasswordCorrect(password)


     // 6. HANDLE INVALID PASSWORDS
    // -> Check if the password verification failed (isPasswordValid is false).
    // -> If it fails, throw a 401 Unauthorized error to block access.
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials")
    }
// Save the refresh token to the database to track active login sessions
    const {accessToken,refreshToken} = await 
    generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken" )

    // 5. send secure cookies & response
    const options = {
        httpOnly: true, // Prevents JavaScript from reading the cookie (protects against XSS) and Always set 'httpOnly: true' so ONLY the backend server can see and touch this cookie.
        secure: false    // Ensures the cookie is only sent over HTTPS
    };

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {user: loggedInUser,accessToken,refreshToken},
            "User Logged In Successfully")
    )
})


const logoutUser = asyncHandler(async(req, res) => {

    // Wrap the asynchronous controller in an `asyncHandler` wrapper
    // WHY: This catches any unhandled promise rejections/errors automatically and passes them 
    // to Express's central error-handling middleware, preventing server crashes without needing repetitive try-catch blocks.


    // STEP 1: Invalidate the user's Refresh Token in the database
    // `req.user` was attached by your authentication middleware (e.g., `verifyJWT`).
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // `$set` with `undefined` (or `null`) removes/clears the `refreshToken` field.
            // WHY: In JWT-based auth, access tokens are short-lived, while refresh tokens stay in the DB.
            // Removing the refresh token from the database prevents the user from obtaining new access tokens after logging out.
            // ($set:) { refreshToken: undefined }
            // we can use unset here 
            $unset : {
                refreshToken: 1 // this removes the field from document
            }
        },
        { new: true } // Return the modified document rather than the original (good practice)
    )

    // STEP 2: Configure cookie security options for clearing browser storage
    // CRITICAL: These options MUST match the flags used when the cookies were originally set,
    // otherwise the browser will fail to locate and clear them.
    const options = {
        httpOnly: true, // Prevents client-side JavaScript (e.g., XSS attacks) from reading the cookie
        secure: true    // Ensures cookies are sent only over HTTPS connections
    }

    // STEP 3: Clear authentication cookies and send the response back to the client
    return res
    .status(200)
    // `clearCookie` instructs the user's browser to delete the named cookie
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        // Send a standardized API response object back to the client
         new ApiResponse(200, {}, "User logout successfully")
    )
})

// 
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure:false,
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken :newRefreshToken},
                "Acsess Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || 
            "Invalid refresh token"
        )
    }

})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.
    isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed Successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfuly"))
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const{fullName,email} = req.body

    if(!(fullName && email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOneAndUpdate(
        req.user?._id,{
            $set:{
                fullName,
                email
            }
        },{
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated succesfully"))
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    // 1. Grab the old avatar URL from the logged-in user object before updating
    // (Assuming req.user contains the full user document from your auth middleware)
    const oldAvatarUrl = req.user?.avatar

    // 2. Upload the new file to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    // 3. Update the database with the new URL
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    // 4. Safely clean up the old avatar from Cloudinary now that oldAvatarUrl is defined
    if (oldAvatarUrl) {
        await deleteFromCloudinary(oldAvatarUrl)
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar uploaded successfully"))
})



const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new :true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"CoverImage uploaded successfully"))
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
    // 1. EXTRACT DATA: Get the username from the URL parameters
    // EXAMPLE: User visits "/api/v1/users/c/aakashbaisla" -> username = "aakashbaisla"
    const { username } = req.params

    // 2. VALIDATION
    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    // 3. AGGREGATION PIPELINE (The Assembly Line)
    const channel = await User.aggregate([
        
        /* 
           STAGE 1: $match
           -------------------------------------------------------------------------
           INPUT (Raw collection): Three distinct user documents exist in the DB.
           RULE: Find username === "aakashbaisla"
           
           OUTPUT OF THIS STAGE:
           [
               { "_id": "USR_AAKASH", "username": "aakashbaisla", "fullName": "Aakash Baisla" }
           ]
        */
        {
            $match : {
                username : username?.toLowerCase()
            }
        },

        /* 
           STAGE 2: $lookup (Find subscribers)
           -------------------------------------------------------------------------
           INPUT: The user document from Stage 1 [USR_AAKASH]
           LOGIC: Look inside the "subscriptions" collection. Find documents where 
                  the "channel" field matches "USR_AAKASH".
                  
           MOCK DATA IN SUBSCRIPTIONS COLLECTION:
           - { subscriber: "USR_VIEWER1", channel: "USR_AAKASH" } <-- Match!
           - { subscriber: "USR_VIEWER2", channel: "USR_AAKASH" } <-- Match!
           
           OUTPUT OF THIS STAGE (A new "subscribers" array is attached):
           [
               { 
                   "_id": "USR_AAKASH", 
                   "username": "aakashbaisla",
                   "subscribers": [
                       { "subscriber": "USR_VIEWER1", "channel": "USR_AAKASH" },
                       { "subscriber": "USR_VIEWER2", "channel": "USR_AAKASH" }
                   ]
               }
           ]
        */
        {
            $lookup : {
                from: "subscriptions",
                localField: "_id",
                foreignField : "channel",
                as: "subscribers"
            }
        },

        /* 
           STAGE 3: $lookup (Find who this channel subscribed to)
           -------------------------------------------------------------------------
           INPUT: The document from Stage 2
           LOGIC: Look inside the "subscriptions" collection. Find documents where 
                  the "subscriber" field matches "USR_AAKASH".
                  
           MOCK DATA IN SUBSCRIPTIONS COLLECTION:
           - { subscriber: "USR_AAKASH", channel: "USR_BAISLA_CHANNEL" } <-- Match!
           
           OUTPUT OF THIS STAGE (A new "subscribedTo" array is attached):
           [
               { 
                   "_id": "USR_AAKASH", 
                   "username": "aakashbaisla",
                   "subscribers": [...],
                   "subscribedTo": [
                       { "subscriber": "USR_AAKASH", "channel": "USR_BAISLA_CHANNEL" }
                   ]
               }
           ]
        */
        {
            $lookup : {
                from: "subscriptions",
                localField: "_id",
                foreignField : "subscriber",
                as: "subscribedTo"
            }
        },

        /* 
           STAGE 4: $addFields (Calculate counts and relationship status)
           -------------------------------------------------------------------------
           INPUT: The document with both populate arrays from Stage 3
           LOGIC: 
             - subscribersCount = length of subscribers array (2 items)
             - channelSubscribedToCount = length of subscribedTo array (1 item)
             - isSubscribed = Is logged-in user (e.g., "USR_VIEWER1") inside subscribers? Yes!
             
           OUTPUT OF THIS STAGE:
           [
               { 
                   "_id": "USR_AAKASH", 
                   "username": "aakashbaisla",
                   "subscribers": [...],
                   "subscribedTo": [...],
                   "subscribersCount": 2,
                   "channelSubscribedToCount": 1,
                   "isSubscribed": true
               }
           ]
        */
        {
            $addFields :{
                subscribersCount : {
                    $size: "$subscribers"
                },
                channelSubscribedToCount : {
                    $size: "$subscribedTo"
                },
                isSubscribed : {
                    $cond :{
                        if : { $in : [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },

        /* 
           STAGE 5: $project (Clean response data)
           -------------------------------------------------------------------------
           INPUT: The fully calculated document from Stage 4
           LOGIC: Drop the heavy raw "subscribers" and "subscribedTo" arrays. Only keep 
                  the requested fields (1 = keep).
                  
           OUTPUT OF THIS STAGE:
           [
               { 
                   "username": "aakashbaisla",
                   "fullName": "Aakash Baisla",
                   "subscribersCount": 2,
                   "channelSubscribedToCount": 1,
                   "isSubscribed": true
               }
           ]
        */
        {
            $project :{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email : 1
            }
        }
    ])

    // 4. CHECK RESULTS
    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist")
    }

    // 5. RESPONSE
    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
        )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        // first Pipeline 
        
        { //here we find user
            $match : {
                _id: new mongoose.Types.ObjectId(req.user._id)// every code goes directly to mongo tha , so we have to create mongoose object id
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField: "_id",
                as: "watchHistory",

                // subpipeline
                pipeline :[
                    {
                        $lookup : {
                            from: "users",
                            localField:"owner",
                            foreignField: "_id",
                            as : "owner",
                            pipeline :[
                                {
                                    $project :{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory ,
            "Watch History fetched successfully"
        )
    )
})

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}




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