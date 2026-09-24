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
        // if (fs.existsSync(localFilePath)) {
        //     fs.unlinkSync(localFilePath);
        // }

        fs.unlinkSync(localFilePath);
        
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

const deleteFromCloudinary = async (cloudinaryUrl) => {
    try {
        if (!cloudinaryUrl) return null

        // Extract the public_id out of the full URL string
        const publicId = cloudinaryUrl.split("/").pop().split(".")[0]

        // delete the file from cloudinary
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true
        })

        return response;

    } catch (error) {
        console.error("Cloudinary Deletion Error Details:", error);
        return null;
    }
}


export {uploadOnCloudinary,deleteFromCloudinary}