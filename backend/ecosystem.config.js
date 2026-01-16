module.exports = {
  apps: [{
    name: 'attendance-backend',
    script: 'dist/src/main.js',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    }
  }]
};
