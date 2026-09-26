import mongoose, {Schema} from "mongoose";

const playlistSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    video : [
        {
        type: Schema.Types.ObjectId,
        ref: "Video"
    }
],
owner : {
    type: Schema.Types.ObjectId,
    ref: "User"
}
},{timestampstrue})

export const Playlist = mongoose.model("Playlist",playlistSchema)