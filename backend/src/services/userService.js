const User = require('../models/User');
const Trip = require('../models/Trip');
const Waypoint = require('../models/Waypoint');

/**
 * Aktualizacja danych profilowych użytkownika
 */
exports.updateUserProfile = async (userId, updateData) => {
    const fieldsToUpdate = {
        username: updateData.username,
        email: updateData.email,
        preferences: updateData.preferences
    };

    // Usuwamy pola o wartości undefined, aby nie nadpisać istniejących danych pustkami
    Object.keys(fieldsToUpdate).forEach(
        key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    return await User.findByIdAndUpdate(userId, fieldsToUpdate, {
        new: true,
        runValidators: true
    }).select('-password');
};

/**
 * Zmiana hasła użytkownika z weryfikacją starego hasła
 */
exports.changeUserPassword = async (userId, oldPassword, newPassword) => {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error("Nie znaleziono użytkownika");

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) throw new Error("Obecne hasło jest nieprawidłowe");

    user.password = newPassword;
    return await user.save(); // pre('save') w modelu zajmie się hashowaniem
};

/**
 * Eksport wszystkich danych użytkownika (konto, wycieczki, punkty trasy)
 */
exports.exportUserData = async (userId) => {
    const user = await User.findById(userId).select('-password').lean();
    if (!user) throw new Error("Nie znaleziono użytkownika");

    const trips = await Trip.find({ user: userId }).lean();
    const waypoints = await Waypoint.find({ trip: { $in: trips.map(t => t._id) } }).sort('order_index').lean();

    return {
        exportedAt: new Date().toISOString(),
        user,
        trips: trips.map(trip => ({
            ...trip,
            waypoints: waypoints.filter(wp => wp.trip.toString() === trip._id.toString()),
        })),
    };
};

/**
 * Usunięcie własnego konta po potwierdzeniu hasłem
 */
exports.deleteOwnAccount = async (userId, password) => {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error("Nie znaleziono użytkownika");
    if (!password || !(await user.matchPassword(password))) {
        throw new Error("Nieprawidłowe hasło");
    }
    await exports.deleteUserCompletely(userId);
};

/**
 * Pobieranie ogólnych statystyk systemu (Liczba użytkowników, wycieczek)
 */
exports.getGlobalStats = async () => {
    const userCount = await User.countDocuments();
    const tripCount = await Trip.countDocuments();
    return {
        totalUsers: userCount,
        totalTrips: tripCount,
        serverStatus: "Online",
        lastChecked: new Date().toLocaleString('pl-PL')
    };
};

/**
 * Zmiana uprawnień (roli) użytkownika - Funkcja Admina
 */
exports.updateRole = async (userId, role) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("Nie znaleziono użytkownika");

    // Blokada zmiany roli dla głównego konta systemowego
    if (user.email === 'superadmin@voyager.pl') {
        throw new Error("Nie można zmienić roli głównego administratora!");
    }

    user.role = role;
    return await user.save();
};

/**
 * Pobieranie listy wszystkich zarejestrowanych użytkowników
 */
exports.fetchUsers = async () => {
    return await User.find().select('-password');
};

/**
 * Kaskadowe usuwanie użytkownika wraz ze wszystkimi wycieczkami i przystankami
 * Czyści bazę danych ze wszystkich powiązanych rekordów
 */
exports.deleteUserCompletely = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("Nie znaleziono użytkownika");

    if (user.email === 'superadmin@voyager.pl') {
        throw new Error("Nie można usunąć Super Admina");
    }

    // 1. Znajdujemy wszystkie wycieczki użytkownika, aby móc usunąć ich punkty
    const userTrips = await Trip.find({ user: userId });
    const tripIds = userTrips.map(t => t._id);

    // 2. Usuwamy punkty (Waypoints) przypisane do wycieczek użytkownika
    if (tripIds.length > 0) {
        await Waypoint.deleteMany({ trip: { $in: tripIds } });
    }

    // 3. Usuwamy wycieczki
    await Trip.deleteMany({ user: userId });

    // 4. Usuwamy profil użytkownika
    return await User.findByIdAndDelete(userId);
};