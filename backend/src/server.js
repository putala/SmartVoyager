const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const userRoutes = require('./routes/userRoutes');
const { protect } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorMiddleware');

// Konfiguracja środowiska i bazy danych
// Upewnij się, że plik .env jest w folderze głównym backend/
dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('Brak JWT_SECRET w pliku .env - serwer nie wystartuje bez klucza do podpisywania tokenów.');
    process.exit(1);
}

connectDB();

const app = express();

// Middleware globalne
app.use(helmet());
// CORS_ORIGIN (lista adresów po przecinku) ogranicza dostęp przeglądarek; bez niej API jest otwarte dla wszystkich
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '100kb' }));

// Ograniczenie prób logowania i rejestracji z jednego adresu IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Definicje tras
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/users', userRoutes);

// Chroniona trasa profilu (dowód działania systemu autoryzacji)
app.get('/api/auth/profile', protect, (req, res) => {
    res.json({
        success: true,
        message: "Dostęp do profilu przyznany! 🛡️",
        user: req.user // Teraz dzięki poprawce w protect, req.user zawiera też rolę!
    });
});

// Podstawowy endpoint sprawdzający stan serwera
app.get('/', (req, res) => {
    res.send('API Voyager śmiga! 🚀');
});

// Middleware do obsługi błędów
app.use(errorHandler);

// Uruchomienie serwera
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🌍 Serwer śmiga na porcie ${PORT}`);
});


