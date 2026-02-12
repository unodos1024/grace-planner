
// Core initialization and global event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Shared global state or shared UI components can be initialized here
    console.log('Grace Planner App Initialized');

    // Global Confetti trigger if needed
    window.createConfetti = () => window.Utils.createConfetti();

    // Global Logout trigger
    window.handleLogout = () => window.Auth.handleLogout();
});
