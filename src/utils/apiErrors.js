class ApiError extends Error {
    constructor(
        statusCode,                  // 1. The HTTP status code (e.g., 400, 404, 500)
        message = "Something went wrong", // 2. Default message if none is provided
        errors = [],                 // 3. Array to hold detailed structural errors
        stack = ""                   // 4. The error stack trace (file paths showing where it crashed)
    ) {
        super(message);              // 5. Calls the parent Error constructor to handle the message tracking
        this.statusCode = statusCode;// 6. Assigns the status code to this specific error object
        this.data = null;            // 7. Explicitly sets data to null (since this is an error, not a successful response)
        this.message = message;      // 8. Assigns our message property
        this.success = false;        // 9. Sets success to false so the frontend can check response.data.success instantly
        this.errors = errors;        // 🛠️ FIX: Changed 'this.errors = this.errors' to 'this.errors = errors'

        if (stack) {
            this.stack = stack;      // 10. If an external stack trace is passed, use it
        } else {
            // 11. Otherwise, automatically capture the exact file and line number where this error happened
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
export{ApiError}