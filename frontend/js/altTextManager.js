import { UIHandler } from "./modules/UIHandler.js";

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
	};

	new UIHandler(elements);
});
