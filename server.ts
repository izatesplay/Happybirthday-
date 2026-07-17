import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';

// Constants and directories
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const SONGS_DIR = path.join(UPLOADS_DIR, 'songs');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Ensure database and directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(SONGS_DIR)) fs.mkdirSync(SONGS_DIR, { recursive: true });
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    const initialDb = {
      songs: [
        {
          id: 'acoustic-birthday',
          title: 'موسیقی ملایم تولد (آکوستیک)',
          artist: 'Instrumental',
          url: 'https://assets.codepen.io/4358584/Anni+Lennon+-+Happy+Birthday.mp3'
        },
        {
          id: 'ambient-lounge',
          title: 'تکنو-پاپ شاد تولد',
          artist: 'Chillout Loop',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
        },
        {
          id: 'piano-magic',
          title: 'پیانو جادویی رویایی',
          artist: 'Classical Piano',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
        }
      ],
      activePhoto: '/src/assets/images/mahshid_avatar_1784284797850.jpg',
      wishes: [
        {
          id: 'w-1',
          sender: 'سارا',
          text: 'مهشید قشنگم تولدت کلی مبارک باشه! امیدوارم امسال به تک تک آرزوهای قشنگت برسی و همیشه بخندی 😍💚',
          color: 'teal',
          timestamp: Date.now() - 3600000 * 2
        },
        {
          id: 'w-2',
          sender: 'امیر',
          text: 'تولدت مبارک ستاره‌ی درخشان! سایه‌ات مستدام و دلت همیشه شاد و لبت خندون باشه برات بهترین‌ها رو می‌خوام 💙✨',
          color: 'blue',
          timestamp: Date.now() - 3600000
        },
        {
          id: 'w-3',
          sender: 'مینا',
          text: 'سبزترین و آرامش‌بخش‌ترین تولد تقدیم به مهشید مهربان. مرسی که همیشه با انرژی مثبتت دنیا رو قشنگ‌تر می‌کنی 🍃🌸',
          color: 'green',
          timestamp: Date.now() - 1800000
        }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
  }
}

ensureDirs();

// Read/write DB utility
function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading DB:', e);
    return { songs: [], activePhoto: null, wishes: [] };
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing DB:', e);
  }
}

// Multer storage configurations
const songStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SONGS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `song_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PHOTOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `photo_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadSong = multer({ storage: songStorage });
const uploadPhoto = multer({ storage: photoStorage });

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Static directory for custom uploads (served via /uploads)
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- API Routes ---

  // Get full app state
  app.get('/api/state', (req, res) => {
    const db = readDb();
    res.json(db);
  });

  // Get only songs
  app.get('/api/songs', (req, res) => {
    const db = readDb();
    res.json(db.songs);
  });

  // Upload custom song
  app.post('/api/songs/upload', uploadSong.single('audio'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { title, artist } = req.body;
    const fileUrl = `/uploads/songs/${req.file.filename}`;

    const newSong = {
      id: `custom-${Date.now()}`,
      title: title || req.file.originalname.replace(/\.[^/.]+$/, ""),
      artist: artist || 'آهنگ بارگذاری شده 🎧',
      url: fileUrl,
      isCustom: true
    };

    const db = readDb();
    db.songs = [newSong, ...db.songs];
    writeDb(db);

    res.json(db.songs);
  });

  // Upload custom photo
  app.post('/api/photo/upload', uploadPhoto.single('photo'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const fileUrl = `/uploads/photos/${req.file.filename}`;

    const db = readDb();
    db.activePhoto = fileUrl;
    writeDb(db);

    res.json({ activePhoto: db.activePhoto });
  });

  // Reset photo to default
  app.post('/api/photo/reset', (req, res) => {
    const db = readDb();
    db.activePhoto = '/src/assets/images/mahshid_avatar_1784284797850.jpg';
    writeDb(db);
    res.json({ activePhoto: db.activePhoto });
  });

  // Get wishes
  app.get('/api/wishes', (req, res) => {
    const db = readDb();
    res.json(db.wishes);
  });

  // Add wish
  app.post('/api/wishes', (req, res) => {
    const { sender, text, color } = req.body;
    if (!sender || !text) {
      return res.status(400).json({ error: 'Sender and text are required' });
    }

    const newWish = {
      id: `wish-${Date.now()}`,
      sender,
      text,
      color: color || 'green',
      timestamp: Date.now()
    };

    const db = readDb();
    db.wishes = [newWish, ...db.wishes];
    writeDb(db);

    res.json(db.wishes);
  });

  // --- Vite / Build Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
