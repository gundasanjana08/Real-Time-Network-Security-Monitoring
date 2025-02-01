const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');
const geoip = require('geoip-lite');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

// Serve static files
app.use(express.static('public'));

// Track statistics
let stats = {
  totalPackets: 0,
  criticalEvents: 0,
  activeThreats: 0,
  protocols: {},
  suspiciousIPs: new Set()
};

// Generate random IP address
function generateIP() {
  return Array.from({length: 4}, () => Math.floor(Math.random() * 256)).join('.');
}

// Generate simulated network event
function generateNetworkEvent() {
  const protocols = ['TCP', 'UDP'];
  const eventTypes = ['normal_traffic', 'port_scan', 'suspicious_origin', 'potential_ddos'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const countries = ['US', 'CN', 'RU', 'GB', 'DE', 'FR', 'JP'];
  
  const sourceIP = generateIP();
  const destinationIP = generateIP();
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const sourceCountry = countries[Math.floor(Math.random() * countries.length)];
  const destinationCountry = countries[Math.floor(Math.random() * countries.length)];
  
  let description;
  switch(eventType) {
    case 'port_scan':
      description = 'Possible port scanning detected';
      break;
    case 'suspicious_origin':
      description = `Traffic from unusual location: ${sourceCountry}`;
      break;
    case 'potential_ddos':
      description = 'High-frequency connections detected';
      break;
    default:
      description = 'Regular network traffic';
  }

  if (severity === 'critical') {
    stats.criticalEvents++;
    stats.suspiciousIPs.add(sourceIP);
  }

  stats.totalPackets++;
  stats.activeThreats = stats.suspiciousIPs.size;

  return {
    timestamp: new Date().toISOString(),
    type: eventType,
    severity: severity,
    sourceIP: sourceIP,
    destinationIP: destinationIP,
    port: Math.floor(Math.random() * 65535),
    protocol: protocol,
    description: description,
    sourceCountry: sourceCountry,
    destinationCountry: destinationCountry
  };
}

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected');

  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// Simulate network traffic
function simulateTraffic() {
  const event = generateNetworkEvent();
  
  // Emit event to all connected clients
  io.emit('security-event', event);
  
  // Also emit updated stats
  io.emit('stats-update', {
    totalPackets: stats.totalPackets,
    criticalEvents: stats.criticalEvents,
    activeThreats: stats.activeThreats
  });
}

// Start traffic simulation
setInterval(simulateTraffic, 2000); // Generate event every 2 seconds

const PORT = 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  process.exit();
});