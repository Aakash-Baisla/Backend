import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiErrors";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models";

/**
 * AUTHENTICATION MIDDLEWARE (verifyJWT)
 * PURPOSE: Protects private routes by validating the user's Access Token.
 * FLOW: Extract Token -> Verify Signature -> Fetch User from DB -> Attach to Request -> Continue (`next()`)
 */
export const verifyJWT = asyncHandler(async (req, _, next) => { // as res is not used here so we can use _ instaed of res its a standard or good practice 
    try {
        // STEP 1: Extract the Access Token
        // Check for the token in two common locations:
        // 1. HttpOnly Cookie (`req.cookies?.accessToken`) - typically used by web apps.
        // 2. Authorization Header (`req.header("Authorization")`) - typically used by mobile apps or external API clients.
        //    `.replace("Bearer ", "")` strips the standard "Bearer " prefix to leave just the raw JWT string.
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        // If no token is provided anywhere in the request, stop immediately.
        if (!token) {
            throw new ApiError(401, "UnAuthorized Request")
        }

        // STEP 2: Verify and decode the JWT
        // `jwt.verify` checks two things:
        // 1. Is the token's digital signature valid (signed with our ACCESS_TOKEN_SECRET)?
        // 2. Has the token expired?
        // If invalid or expired, `jwt.verify` throws an error, jumping straight to the `catch` block.
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        // STEP 3: Fetch the user from the database
        // Use the `_id` stored inside the decoded token payload.
        // `.select("-password -refreshToken")` excludes sensitive fields from being fetched into memory.
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        // If the token was valid but the user no longer exists in the DB (e.g., account deleted).
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }

        // STEP 4: Attach the user object to the Request object (`req.user`)
        // WHY: Express request objects pass through the entire middleware chain. 
        // By attaching `req.user` here, any downstream route controller (like `logoutUser` or `getProfile`)
        // can instantly access the logged-in user's details without querying the DB again.
        req.user = user

        // STEP 5: Pass control to the next middleware or route handler in the chain.
        next()

    } catch (error) {
        // Catch invalid signatures, expired tokens, or thrown ApiErrors and pass a standardized 401 error.
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})