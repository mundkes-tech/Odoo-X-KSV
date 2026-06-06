require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const rfqRoutes = require('./routes/rfqRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const comparisonRoutes = require('./routes/comparisonRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const emailRoutes = require('./routes/emailRoutes');

const logger = require('./utils/logger');
const { testConnection, initializeDatabase, pool } = require('./config/db');

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || '*',
	})
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/vendors', vendorRoutes);

app.get('/health', async (req, res, next) => {
	try {
		const dbPing = await pool.query('SELECT 1 AS ok;');

		return res.status(200).json({
			success: true,
			message: 'VendorBridge backend is healthy.',
			timestamp: new Date().toISOString(),
			database: dbPing.rows[0].ok === 1 ? 'connected' : 'unknown',
		});
	} catch (error) {
		return next(error);
	}
});

app.use('/', rfqRoutes);
app.use('/quotations', quotationRoutes);
app.use('/', comparisonRoutes);
app.use('/', approvalRoutes);
app.use('/', purchaseOrderRoutes);
app.use('/', pdfRoutes);
app.use('/', emailRoutes);
app.use('/', notificationRoutes);
app.use('/', reportRoutes);

app.use((req, res) => {
	res.status(404).json({
		success: false,
		message: `Route not found: ${req.method} ${req.originalUrl}`,
	});
});

app.use((error, req, res, next) => {
	logger.error('Unhandled application error.', {
		path: req.originalUrl,
		method: req.method,
		message: error.message,
		stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
	});

	const statusCode = error.statusCode || 500;

	res.status(statusCode).json({
		success: false,
		message: error.message || 'Internal server error.',
		error_code: statusCode,
	});
});

async function startServer() {
	try {
		if (!process.env.DATABASE_URL) {
			throw new Error('DATABASE_URL is missing in environment variables.');
		}

		if (!process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET is missing in environment variables.');
		}

		logger.info('Starting VendorBridge backend server...');

		await testConnection();
		await initializeDatabase();

		app.listen(PORT, () => {
			logger.info(`VendorBridge backend running on port ${PORT}.`);
		});
	} catch (error) {
		logger.error('Server startup failed.', { error: error.message });
		process.exit(1);
	}
}

process.on('unhandledRejection', (reason) => {
	logger.error('Unhandled promise rejection detected.', {
		reason: reason instanceof Error ? reason.message : String(reason),
	});
});

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception detected. Shutting down process.', {
		error: error.message,
	});
	process.exit(1);
});

startServer();
