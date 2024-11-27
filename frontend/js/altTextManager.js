import { UIHandler } from "./modules/UIHandler.js";
import { ImportHandler } from "./modules/ImportHandler.js";

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	const elements = {
		exportForm: document.getElementById("exportForm"),
		projectSelect: document.getElementById("projectSelect"),
		loList: document.getElementById("loList"),
		exportResult: document.getElementById("exportResult"),
		exportActions: document.getElementById("exportActions"),
		downloadBtn: document.getElementById("downloadBtn"),
		emailBtn: document.getElementById("emailBtn"),
		// Add these elements for import functionality
		importForm: document.getElementById("importForm"),
		importFile: document.getElementById("importFile"),
		importResult: document.getElementById("importResult"),
	};

	new UIHandler(elements);

	// Initialize import handler with the import-related elements
	const importHandler = new ImportHandler();
});
