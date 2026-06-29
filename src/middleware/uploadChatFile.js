import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ENSURE UPLOAD DIRECTORIES EXIST
const chatUploadDir = path.join(__dirname, "../../uploads/chat");
const voiceUploadDir = path.join(__dirname, "../../uploads/chat/voice");

if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

if (!fs.existsSync(voiceUploadDir)) {
  fs.mkdirSync(voiceUploadDir, { recursive: true });
}

// STORAGE CONFIGURATION FOR CHAT FILES (IMAGES & DOCUMENTS)
const chatFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// STORAGE CONFIGURATION FOR VOICE FILES
const voiceFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voiceUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// FILE FILTER FOR CHAT FILES (IMAGES & DOCUMENTS)
const chatFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: JPEG, PNG, WebP, PDF, DOC, DOCX`
      ),
      false
    );
  }
};

// FILE FILTER FOR VOICE FILES
const voiceFileFilter = (req, file, cb) => {
  const allowedMimes = [
    "audio/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid audio type. Allowed types: WebM, MP3, WAV, M4A`
      ),
      false
    );
  }
};

// MULTER UPLOAD FOR CHAT FILES (10MB MAX)
export const uploadChatFile = multer({
  storage: chatFileStorage,
  fileFilter: chatFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// MULTER UPLOAD FOR VOICE FILES (10MB MAX)
export const uploadVoiceFile = multer({
  storage: voiceFileStorage,
  fileFilter: voiceFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
