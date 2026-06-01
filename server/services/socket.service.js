const jwt = require('jsonwebtoken');

function init(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    console.log(`Socket connected: ${user.full_name} (${user.role})`);

    socket.join(`user_${user.id}`);
    socket.join(user.role);

    if (user.role === 'vendor') {
      socket.join(`vendor_${user.id}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.full_name}`);
    });
  });
}

module.exports = { init };
