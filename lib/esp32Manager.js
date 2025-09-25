// Import necessary modules
import { SerialPort, ReadlineParser } from 'serialport';
import { EventEmitter } from 'events';
// import { setTimeout } from 'timers/promises'; // <-- REMOVA ESTA LINHA

// Define the command for device identification
const IDENTIFICATION_COMMAND = '{"action":"get_device_info"}\n';

// Define the response timeout for device identification
const IDENTIFICATION_TIMEOUT = 1000;

// Manages multiple ESP32 serial connections and their events.
export class Esp32MultiManager extends EventEmitter {
    baudRate;
    activeConnections = new Map();

    constructor(baudRate = 115200) {
        super();
        this.baudRate = baudRate;
    }

    /**
     * Finds and identifies all connected ESP32 devices.
     * @returns {Promise<Array<{ path: string, info: object }>>} A promise that resolves with an array of found devices.
     */
    async discoverDevices() {
        const discovered = [];
        const ports = await SerialPort.list();
        const probePromises = ports.map(portInfo => this.probePort(portInfo));

        const results = await Promise.all(probePromises);
        results.forEach(result => {
            if (result) {
                discovered.push(result);
            }
        });

        return discovered;
    }

    /**
     * Probes a single serial port to check if it's an ESP32.
     * @param {object} portInfo Information about the serial port.
     * @returns {Promise<{ path: string, info: object } | null>} A promise that resolves with the device info or null.
     */
    async probePort(portInfo) {
        return new Promise((resolve) => {
            let port = null;
            try {
                port = new SerialPort({ path: portInfo.path, baudRate: this.baudRate });
                const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

                // Use the standard setTimeout and clearTimeout
                const timeout = setTimeout(() => {
                    port?.close();
                    resolve(null);
                }, IDENTIFICATION_TIMEOUT);

                parser.on('data', (line) => {
                    try {
                        const jsonResponse = JSON.parse(line.toString());
                        if (jsonResponse.status === 'success' && jsonResponse.hostname) {
                            clearTimeout(timeout);
                            port?.close();
                            resolve({ path: portInfo.path, info: jsonResponse });
                        }
                    } catch (e) {
                        // Ignore non-JSON or incomplete messages
                    }
                });

                port.on('error', () => {
                    clearTimeout(timeout);
                    port?.close();
                    resolve(null);
                });

                port.on('open', () => {
                    // Use the standard setTimeout here as well
                    setTimeout(() => {
                        port?.write(IDENTIFICATION_COMMAND, (err) => {
                            if (err) {
                                clearTimeout(timeout);
                                port?.close();
                                resolve(null);
                            }
                        });
                    }, 250);
                });
            } catch (error) {
                port?.close();
                resolve(null);
            }
        });
    }

    /**
     * Connects to a specific ESP32 device by its serial port path.
     * @param {string} portPath The path of the serial port.
     * @param {object} deviceInfo The identification object from discovery.
     */
    async connect(portPath, deviceInfo) {
        if (this.activeConnections.has(portPath)) {
            return;
        }

        return new Promise((resolve, reject) => {
            const port = new SerialPort({
                path: portPath,
                baudRate: this.baudRate,
            }, (err) => {
                if (err) {
                    return reject(new Error(`Failed to connect to ${portPath}: ${err.message}`));
                }
                
                this.activeConnections.set(portPath, { port, deviceInfo });
                
                const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
                
                parser.on('data', (data) => {
                    try {
                        const parsedData = JSON.parse(data);
                        this.emit('data', { device: deviceInfo, data: parsedData, path: portPath });
                    } catch (e) {
                        this.emit('data', { device: deviceInfo, data, path: portPath });
                    }
                });
                
                port.on('error', (err) => {
                    this.emit('error', { device: deviceInfo, error: err, path: portPath });
                });
                
                port.on('close', () => {
                    this.activeConnections.delete(portPath);
                    this.emit('disconnected', { device: deviceInfo, path: portPath });
                });

                this.emit('connected', { device: deviceInfo, path: portPath });
                resolve();
            });
        });
    }

    /**
     * Sends a JSON object to a specific connected ESP32 device.
     * @param {string} portPath The path of the serial port to send data to.
     * @param {object} payload The JavaScript object to send.
     */
    async sendJson(portPath, payload) {
        const connection = this.activeConnections.get(portPath);
        if (!connection || !connection.port.isOpen) {
            throw new Error(`No active connection found for port: ${portPath}`);
        }

        const jsonString = JSON.stringify(payload) + '\n';
        return new Promise((resolve, reject) => {
            connection.port.write(jsonString, (err) => {
                if (err) {
                    return reject(new Error(`Failed to write to serial port ${portPath}: ${err.message}`));
                }
                resolve();
            });
        });
    }

    /**
     * Disconnects from a specific serial port or all if none is specified.
     * @param {string} [portPath] The path of the serial port to disconnect from.
     */
    async disconnect(portPath) {
        if (portPath) {
            const connection = this.activeConnections.get(portPath);
            if (connection && connection.port.isOpen) {
                return new Promise((resolve) => connection.port.close(resolve));
            }
        } else {
            const disconnectPromises = [...this.activeConnections.values()].map(conn => {
                if (conn.port.isOpen) {
                    return new Promise((resolve) => conn.port.close(resolve));
                }
                return Promise.resolve();
            });
            await Promise.all(disconnectPromises);
        }
    }
}
