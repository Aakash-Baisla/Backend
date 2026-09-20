import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        // file has been uploaded successfully
        // console.log("file is uploaded on cloudinary",response.url);
        fs.unlink(localFilePath)
        return response;

    }catch (error) {
        console.error("Cloudinary Upload Error Details:", error); // <-- ADD THIS LINE
        
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath); // remove the locally saved temp file safely
            }
        } catch (unlinkError) {
            console.error("Failed to delete local file:", unlinkError);
        }
        
        return null;
    }
}

export {uploadOnCloudinary}