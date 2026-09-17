const asyncHandler = (requestHandler) =>{
    return (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=>next(err))
    }
}
export {asyncHandler}



// // A higher-order function (wrapper) to automate try-catch blocks across database controllers
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next); // Executes the actual controller logic asynchronously
//     } catch (error) {
//         // Automatically catches any errors, sends an HTTP status code (defaults to 500), and returns a clean JSON response
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };
