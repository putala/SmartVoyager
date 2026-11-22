/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    // Zakres testów: generowanie punktów trasy na podstawie ustawień wycieczki
    collectCoverageFrom: [
        'src/services/aiService.js',
        'src/services/planning/**/*.js',
    ],
    clearMocks: true,
    restoreMocks: true,
    passWithNoTests: true,
};
