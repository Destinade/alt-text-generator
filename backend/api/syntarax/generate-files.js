import { generateExcel } from "../../services/excelService.js";
import { generatePDF } from "../../services/pdfService.js";

function getTimestamp() {
	const now = new Date();
	return now.toISOString().replace(/[:.]/g, "-");
}

export default async function handler(req, res) {
	// CORS headers
	const allowedOrigins = [
		"https://edwincontent.nelsontechdev.com",
		"https://syntarax.vercel.app",
		"http://localhost:3000",
		"http://localhost:5000",
		"http://localhost:5500",
		"http://127.0.0.1:5500",
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
		console.log(
			"Received data in generate-files:",
			JSON.stringify(data, null, 2)
		);

		if (!data) {
			return res.status(400).json({
				success: false,
				error: "No data provided",
			});
		}

		const timestamp = getTimestamp();

		// Handle multiple LOs
		const stats = data.stats;
		const results = data.results;
		const projectId = data.projectId;

		// Generate combined files for all successful LOs
		const [excelBuffer, pdfBuffer] = await Promise.all([
			generateExcel({ stats, results, projectId }),
			generatePDF({ stats, results }),
		]);

		console.log("Excel buffer size:", excelBuffer?.length);
		console.log("PDF buffer size:", pdfBuffer?.length);
		console.log("Results count:", results?.length);
		console.log(
			"Successful results:",
			results?.filter((r) => r.success && r.images?.length > 0).length
		);

		// Adjust or remove size check
		if (!excelBuffer || !pdfBuffer) {
			throw new Error("Failed to generate files");
		}

		// Use timestamp for combined files
		return res.status(200).json({
			success: true,
			files: {
				excel: {
					buffer: excelBuffer.toString("base64"),
					filename: `alt-text-batch-${timestamp}.xlsx`,
				},
				pdf: {
					buffer: pdfBuffer.toString("base64"),
					filename: `alt-text-preview-batch-${timestamp}.pdf`,
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
