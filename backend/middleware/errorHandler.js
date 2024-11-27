export class AppError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
		this.isOperational = true;

		Error.captureStackTrace(this, this.constructor);
	}
}

export const errorHandler = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || "error";

	// Log error for debugging
	console.error("Error:", {
		message: err.message,
		stack: err.stack,
		statusCode: err.statusCode,
	});

	// Handle specific error types
	if (err.name === "ValidationError") {
		return res.status(400).json({
			success: false,
			error: "Validation Error",
			details: err.message,
		});
	}

	if (err.code === "LIMIT_FILE_SIZE") {
		return res.status(400).json({
			success: false,
			error: "File size limit exceeded",
			details: "Maximum file size is 50MB",
		});
	}

	// Handle AWS S3 errors
	if (err.name === "NoSuchKey" || err.name === "NoSuchBucket") {
		return res.status(404).json({
			success: false,
			error: "Resource not found",
			details: err.message,
		});
	}

	// Development vs Production error responses
	if (process.env.NODE_ENV === "development") {
		return res.status(err.statusCode).json({
			success: false,
			error: err.message,
			stack: err.stack,
			status: err.status,
		});
	}

	// Production error response (no stack trace)
	return res.status(err.statusCode).json({
		success: false,
		error: err.isOperational ? err.message : "Internal server error",
	});
};
