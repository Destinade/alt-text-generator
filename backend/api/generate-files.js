import { generateExcel } from "../services/excelService.js";
import { generatePDF } from "../services/pdfService.js";

function getTimestamp() {
	const now = new Date();
	return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
		2,
		"0"
	)}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(
		2,
		"0"
	)}${String(now.getMinutes()).padStart(2, "0")}`;
}

export default async function handler(req, res) {
	// CORS headers
	const allowedOrigins = [
		"https://edwincontent.nelsontechdev.com",
		"http://localhost:3000",
		"http://localhost:5000",
		"http://localhost:5500",
		"http://localhost:8000",
		"http://localhost",
	];

	const origin = req.headers.origin;
	if (allowedOrigins.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	}

	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Origin");
	res.setHeader("Access-Control-Allow-Credentials", "true");

	if (req.method === "OPTIONS") {
		res.status(200).end();
		return;
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { data } = req.body;
		console.log("Received data in generate-files");

		if (!data) {
			return res.status(400).json({
				success: false,
				error: "No data provided",
			});
		}

		const timestamp = getTimestamp();
		const [excelBuffer, pdfBuffer] = await Promise.all([
			generateExcel(data),
			generatePDF(data),
		]);

		console.log("Excel buffer size:", excelBuffer?.length);
		console.log("PDF buffer size:", pdfBuffer?.length);

		if (
			!excelBuffer ||
			!pdfBuffer ||
			excelBuffer.length < 1000 ||
			pdfBuffer.length < 1000
		) {
			throw new Error("Generated files are too small");
		}

		return res.status(200).json({
			success: true,
			files: {
				excel: {
					buffer: excelBuffer.toString("base64"),
					filename: `alt-text-${data.loId}-${timestamp}.xlsx`,
				},
				pdf: {
					buffer: pdfBuffer.toString("base64"),
					filename: `alt-text-preview-${data.loId}-${timestamp}.pdf`,
				},
			},
		});
	} catch (error) {
		console.error("Error in generate-files:", error);
		return res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}
