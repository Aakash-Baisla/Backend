//  Custom api response 
// A standardized class to structure all successful API responses sent back to the frontend
class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode; // The HTTP status code (e.g., 200 for OK, 201 for Created)
        this.data = data;             // The main data payload (e.g., User object, video details, arrays)
        this.message = message;       // A clear, user-friendly status message
        this.success = statusCode < 400; // Automatically sets to true if the status code is a success code (below 400)
    }
}
