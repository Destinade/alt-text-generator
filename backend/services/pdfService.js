const PDFDocument = require("pdfkit");

async function generatePDF(data) {
	const doc = new PDFDocument({
		size: "A4",
		margin: 50,
	});

	// Add content similar to existing PDFGenerator logic
	// ...

	return new Promise((resolve, reject) => {
		const chunks = [];
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		doc.end();
	});
}

module.exports = { generatePDF };
