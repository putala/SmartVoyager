const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Pomocnicza funkcja do generowania tokena JWT
 */
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

/**
 * Rejestracja nowego użytkownika
 */
exports.registerUser = async (userData) => {
    const { username, email, password } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error("Użytkownik o tym mailu już istnieje");
    }

    const newUser = new User({ username, email, password });
    return await newUser.save();
};

/**
 * Logowanie i generowanie sesji
 */
exports.authenticateUser = async (email, password) => {
    // 1. Pobieramy użytkownika wraz z zahashowanym hasłem
    // Ten sam komunikat dla obu błędów, żeby nie zdradzać, czy konto istnieje
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
        throw new Error("Nieprawidłowy e-mail lub hasło");
    }

    // 3. Generujemy token
    const token = generateToken(user);

    return {
        token,
        user: {
            username: user.username,
            email: user.email,
            role: user.role
        }
    };
};