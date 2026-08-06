// Future memory and preference persistence for Avery
window.AveryMemory = {
    get: function (key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch (err) {
            return fallback;
        }
    },
    set: function (key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    remove: function (key) {
        localStorage.removeItem(key);
    }
};
