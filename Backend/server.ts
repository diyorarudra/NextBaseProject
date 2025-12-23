
import Fastify from "fastify"; //
import mongoose from "mongoose"; //

import cors from "@fastify/cors";//

import multipart from "@fastify/multipart";
import { pipeline } from "stream/promises";
import fastifyStatic from "@fastify/static";

//For  Vidio Crop
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobePath.path as string);

//Use For Resize Img
import sharp from "sharp";

import fs from "fs";
import path from "path";
import http from "http";

import { Server } from "socket.io";


const app = Fastify({
  bodyLimit: 500 * 1024 * 1024, // ✅ 50 MB
});

app.register(cors);


export const io = new Server(app.server, {
  cors: {
    origin: "http://localhost:3000/dashboard",
  },
});
io.on("connection", (socket) => {
  console.log("🟢 Frontend connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Frontend disconnected");
  });
});

async function start() {
  try {
    const mongoUrl = process.env.MONGO_URL || "mongodb://mongo:27017/DBSS";
    await mongoose.connect(mongoUrl);
    console.log("MongoDB connected");

    await app.listen({ port: 5000, host: '0.0.0.0' });
    console.log("Server running on http://0.0.0.0:5000");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

start();

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1️⃣ Uploads (ONLY ONE sendFile)
app.register(fastifyStatic, {
  root: path.join(__dirname, "uploads"),
  prefix: "/uploads/",
});

// 2️⃣ Image thumbnails
app.register(fastifyStatic, {
  root: path.join(__dirname, "thumbnails"),
  prefix: "/thumbnails/",
  decorateReply: false,
});

// 3️⃣ Video thumbnails
app.register(fastifyStatic, {
  root: path.join(__dirname, "video-thumbnails"),
  prefix: "/video-thumbnails/",
  decorateReply: false,
});


app.get("/api/download/:filename", async (req, reply) => {
  const { filename } = req.params as { filename: string };

  reply.header(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  return reply.sendFile(filename, path.join(__dirname, "uploads"));
});

// Enable file uploads
app.register(multipart);


const FileSchema = new mongoose.Schema({
  filename: String,
  user: String,
  status: { type: String, default: "pending" },
  type: { type: String },          // image | video
  thumbnail: { type: String },     // thumbnail file name
});

const FileModel = mongoose.model("File", FileSchema);


async function generateVideoThumbnail(
  fileId: string,
  filename: string
) {
  try {
    const inputPath = path.join(__dirname, "uploads", filename);
    const outputImage = filename.replace(/\.[^/.]+$/, ".png");
    const outputPath = path.join(
      __dirname,
      "video-thumbnails",
      outputImage
    );

    await FileModel.findByIdAndUpdate(fileId, {
      status: "processing",
    });

      io.emit("file-status", {
      _id: fileId,
      status: "processing",
    });
    // Extract frame from middle of video
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          timemarks: ["50%"], // middle frame
          filename: outputImage,
          folder: path.join(__dirname, "video-thumbnails"),
          size: "128x128",
        })
        .on("end", resolve)
        .on("error", reject);
    });

    await FileModel.findByIdAndUpdate(fileId, {
      status: "completed",
      thumbnail: outputImage,
      type: "video",
    });
        io.emit("file-status", {
      _id: fileId,
      status: "completed",
      thumbnail: outputImage,
        type: "video",
    });
  } catch (err) {
    console.error("Video thumbnail error:", err);
    await FileModel.findByIdAndUpdate(fileId, {
      status: "failed",
    });
        io.emit("file-status", {
      _id: fileId,
      status: "failed",
    });
  }
}


async function generateThumbnail(fileId: string, filename: string) {
  try {
    const inputPath = path.join(__dirname, "uploads", filename);
    const thumbName = filename.replace(/\.[^/.]+$/, ".jpg");
    const outputPath = path.join(__dirname, "thumbnails", thumbName);
    // Update status → processing
    await FileModel.findByIdAndUpdate(fileId, {
      status: "processing",
    });
    io.emit("file-status", {
      _id: fileId,
      status: "processing",
    });

    await sharp(inputPath)
      .rotate()
      .resize(128, 128)
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // Update status → completed
    await FileModel.findByIdAndUpdate(fileId, {
      status: "completed",
      thumbnail: thumbName,   // ✅ SAVE thumbnail name
      type: "image",
    });
    io.emit("file-status", {
      _id: fileId,
      status: "completed",
      thumbnail: thumbName,
      type: "image",
    });
  } catch (err) {
    console.error("Thumbnail error:", err);

    // Update status → failed
    await FileModel.findByIdAndUpdate(fileId, {
      status: "failed",
    });
    io.emit("file-status", {
      _id: fileId,
      status: "failed",
    });
  }
}

// Upload API
app.post("/api/upload", async (req, reply) => {
  const parts = req.parts();

  for await (const part of parts) {
    if (part.file) {
      // Save file
      const uploadPath = path.join(__dirname, "uploads", part.filename);
      await pipeline(part.file,
        fs.createWriteStream(uploadPath)
      );

      const savedFile = await FileModel.create({
        filename: part.filename,
        user: "user1",
        status: "processing",
        type: isVideo(part.filename) ? "video" : "image",
      });

      io.emit("file-status", {
        _id: savedFile._id,
        status: "processing",
      });

      if (isImage(part.filename)) {
        generateThumbnail(savedFile._id.toString(), part.filename);
      }

      if (isVideo(part.filename)) {
        generateVideoThumbnail(savedFile._id.toString(), part.filename);
      }
    }
  }

  reply.send({ message: "Files uploaded successfully!" });
});



// Get uploaded files
app.get("/api/files", async (req, reply) => {
  const files = await FileModel.find();
  reply.send(files);
});





////////////////////////////////////////////////////
//Check For Is Video
function isVideo(filename: string) {
  return /\.(mp4|mov|avi|mkv|webm)$/i.test(filename);
}

function isImage(filename: string) {
  return /\.(jpg|jpeg|png|webp)$/i.test(filename);
}
////////////////////////////////////////////////////////////// Login Register

interface IUser {
  email: string;
  password: string;
}

const userSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model<IUser>("User", userSchema);


//Sign Up
app.post("/api/signup", async (req, reply) => {

  try {
    const { email, password } = req.body as IUser;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { error: "User already exists" };
    }

    const newUser = new User({ email, password: password });
    await newUser.save();

    return { message: "Signup successful", user: { email: newUser.email } };
  } catch (err) {
    return { error: err };
  }
});

//login
app.post("/api/login", async (req, reply) => {
  try {
    const { email, password } = req.body as IUser;

    const user = await User.findOne({ email });
    if (!user) {
      return { error: "User not found" };
    }

    if (password != user.password) {
      return { error: "Invalid password" };
    }

    return { message: "Login successful", user: { email: user.email } };
  } catch (err) {
    return { error: err };
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////

