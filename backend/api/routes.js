const express = require("express");
const router = express.Router();
const { generateExcel } = require("../services/excelService");
const { generatePDF } = require("../services/pdfService");
const { handleImport } = require("../services/importService");

// Generate both Excel and PDF files
router.post("/generate-files", async (req, res) => {
	try {
		const { data } = req.body;

		// Generate both files
		const excelBlob = await generateExcel(data);
		const pdfBlob = await generatePDF(data);

		res.json({
			success: true,
			files: {
				excel: excelBlob,
				pdf: pdfBlob,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

// Handle import
router.post("/import", async (req, res) => {
	try {
		const result = await handleImport(req.body);
		res.json(result);
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

module.exports = router;
