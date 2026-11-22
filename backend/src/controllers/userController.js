const userService = require('../services/userService');

exports.updateProfile = async (req, res) => {
    try {
        const user = await userService.updateUserProfile(req.user.id, req.body);
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        await userService.changeUserPassword(req.user.id, req.body.oldPassword, req.body.newPassword);
        res.status(200).json({ success: true, message: "Hasło zostało zmienione" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.exportMyData = async (req, res) => {
    try {
        const data = await userService.exportUserData(req.user.id);
        res.setHeader('Content-Disposition', 'attachment; filename="smart-voyager-dane.json"');
        res.status(200).json(data);
    } catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
};

exports.deleteMyAccount = async (req, res) => {
    try {
        await userService.deleteOwnAccount(req.user.id, req.body?.password);
        res.status(200).json({ success: true, message: "Konto i wszystkie dane zostały usunięte" });
    } catch (err) {
        res.status(403).json({ success: false, message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await userService.deleteUserCompletely(req.params.id);
        res.status(200).json({ success: true, message: "Użytkownik usunięty kaskadowo" });
    } catch (err) {
        res.status(403).json({ success: false, message: err.message });
    }
};

exports.getSystemStats = async (req, res) => {
    try {
        const stats = await userService.getGlobalStats();
        res.status(200).json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const user = await userService.updateRole(req.params.id, req.body.role);
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await userService.fetchUsers();
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};