const ExcelJS = require("exceljs");

async function generateExcel(data) {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Alt Text Data");

	// Add title
	worksheet.mergeCells("A1:C1");
	const titleCell = worksheet.getCell("A1");
	titleCell.value = `Alt Text Data - LO ID: ${data.loId}`;
	titleCell.font = { size: 14, bold: true };
	titleCell.alignment = { horizontal: "center" };

	// Add metadata
	worksheet.getCell("A3").value = "LO ID:";
	worksheet.getCell("B3").value = data.loId;
	worksheet.getCell("A4").value = "Grade Level:";
	worksheet.getCell("B4").value = data.gradeLevel;
	worksheet.getCell("A5").value = "Relative Link:";
	worksheet.getCell("B5").value = data.relativeLink;

	// Style metadata
	["A3", "A4", "A5"].forEach((cell) => {
		worksheet.getCell(cell).font = { bold: true };
	});

	// Add headers and data (similar to existing code)
	// ...

	const buffer = await workbook.xlsx.writeBuffer();
	return buffer;
}

module.exports = { generateExcel };
