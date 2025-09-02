import {
	App,
	Modal,
	Plugin,
	PluginSettingTab,
	Setting,
	Notice,
	MarkdownView,
} from "obsidian";
import * as path from "path";

const imageFormats = {
	"image/jpeg": "JPEG",
	"image/webp": "WebP",
	// Add more as needed
};

class CustomModal extends Modal {
	plugin: pasteToJpeg;
	wasCancelled = false;
	resizeInput: HTMLInputElement;
	compressInput: HTMLInputElement;
	formatSelect: HTMLSelectElement;

	constructor(app: App, plugin: pasteToJpeg) {
		super(app);
		this.wasCancelled = false;
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;

		// Create divs to group related elements
		const resizeDiv = contentEl.createEl("div", { cls: "input-group" });
		const formatDiv = contentEl.createEl("div", { cls: "input-group" });
		const compressDiv = contentEl.createEl("div", { cls: "input-group" });
		const buttonDiv = contentEl.createEl("div", { cls: "button-group" });

		// Create and append labels
		resizeDiv.createEl("span", { text: "clip image bigger than: " });
		formatDiv.createEl("span", { text: "Output Format: " });
		compressDiv.createEl("span", { text: "Compression:" });

		// Create the inputs
		this.resizeInput = resizeDiv.createEl("input", {
			type: "text",
			value: this.plugin.settings.maxdim,
		});
		this.compressInput = compressDiv.createEl("input", {
			type: "text",
			value: this.plugin.settings.compression,
		});

		this.formatSelect = formatDiv.createEl("select");
		for (const [value, text] of Object.entries(imageFormats)) {
			const option = this.formatSelect.createEl("option", { value, text });
			// Setting the default value based on plugin.settings.format
			if (this.plugin.settings.imgFormat === value) {
				option.selected = true;
			}
		}

		console.log(`"format select is"${this.formatSelect.value}`);

		// Create the buttons
		const confirmButton = buttonDiv.createEl("button", {
			text: "OK",
			type: "submit",
		});
		const cancelButton = buttonDiv.createEl("button", { text: "Cancel" });

		confirmButton.addEventListener("click", () => {
			this.wasCancelled = false; // Set to false when OK is clicked
			this.close();
		});

		cancelButton.addEventListener("click", () => {
			this.wasCancelled = true;
			this.close();
		});
	}
}

interface UserSettings {
	format: string;
	maxdim: string;
	cancelled: boolean;
	compression: string;
}

async function getUserSettings(plugin: pasteToJpeg): Promise<UserSettings> {
	console.log(`"the plugin in getUserSettings is ${plugin}`);
	return new Promise((resolve, reject) => {
		const myModal = new CustomModal(plugin.app, plugin);
		myModal.onClose = () => {
			// Get the values from the class properties instead of calling onClose again.
			resolve({
				format: myModal.formatSelect.value,
				maxdim: myModal.resizeInput.value,
				cancelled: myModal.wasCancelled,
				compression: myModal.compressInput.value,
			});
		};
		myModal.open();
	});
}

interface pasteToJpegSettings {
	compression: string;
	maxdim: string;
	imgPrefix: string;
	imgPath: string;
	imgFormat: string;
	convertInEditorOnly: boolean;
	askUser: boolean;
	saveaskUser: boolean;
}

const DEFAULT_SETTINGS: pasteToJpegSettings = {
	compression: "0.95",
	maxdim: "0",
	imgPrefix: "",
	imgFormat: "image/jpeg", // or 'image/webp'
	imgPath: "",
	convertInEditorOnly: true,
	askUser: false,
	saveaskUser: false,
};

export default class pasteToJpeg extends Plugin {
	settings: pasteToJpegSettings;
	boundHandlePaste: (e: ClipboardEvent) => void;

	async onload() {
		await this.loadSettings();
		this.boundHandlePaste = (e: ClipboardEvent) => this.handlePaste(e);
		document.addEventListener("paste", this.boundHandlePaste, true);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		//document.removeEventListener('paste', this.handlePaste.bind(this),true);
		document.removeEventListener("paste", this.boundHandlePaste, true);
	}

	isInEditor(): boolean {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf) return false;

		// Check if we're in a markdown view
		return activeLeaf.view.getViewType() === "markdown";
	}

	async handlePaste(e: ClipboardEvent) {
		console.log("HandlePaste called, this:", this);
		console.log("isInEditor method exists:", typeof this.isInEditor);

		const clipboardData = e.clipboardData;
		if (!clipboardData) return;

		const items = clipboardData.items || [];

		if (this.settings.convertInEditorOnly && !this.isInEditor()) {
			console.log("Not in editor, skipping conversion");
			return;
		}

		console.log("Processing paste items:", items.length);

		for (const index in items) {
			const item = items[index];
			console.log(`${item.kind}, ${item.type}`);
			if (
				item.kind === "file" &&
				item.type?.startsWith("image/") &&
				item.type !== "image/svg+xml"
			) {
				console.log("Found image to convert");
				e.stopPropagation();
				e.preventDefault();
				//const userSettings = await getUserSettings();
				//console.log(`${userSettings}`);

				this.saveitem2Format(item);
				//this.saveitem2Format(item,'image/jpeg');
			}
		}
	}

	saveitem2Format(item: DataTransferItem): void {
		const blob = item.getAsFile();
		if (!blob) return;

		const reader = new FileReader();

		//console.log(`Original blob size: ${blob.size}`);

		reader.onload = async (event) => {
			if (!event.target?.result) return;

			const img = new Image();
			img.src = event.target.result as string;

			img.onload = async () => {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				if (!ctx) return;

				let maxdim = this.settings.maxdim;
				let compression = this.settings.compression;
				let format = this.settings.imgFormat;

				if (this.settings.askUser) {
					try {
						const userSettings = await getUserSettings(this);
						console.log(`'user selected:'${userSettings}`);
						/*format,maxdim,cancelled,compression*/
						if (!userSettings.cancelled) {
							compression = userSettings.compression;
							maxdim = userSettings.maxdim;
							format = userSettings.format;
							if (this.settings.saveaskUser) {
								this.settings.maxdim = maxdim;
								this.settings.compression = compression;
								this.settings.imgFormat = format;
								await this.saveSettings();
							}
						} else {
							return; // User cancelled, don't process the image
						}
					} catch (error) {
						console.error("Failed to get user settings:", error);
						return;
					}
				}

				const [newWidth, newHeight] = this.getDims(
					img,
					parseInt(maxdim),
				);

				canvas.width = newWidth;
				canvas.height = newHeight;
				ctx.drawImage(img, 0, 0, newWidth, newHeight);

				canvas.toBlob(
					async (newBlob) => {
						if (!newBlob) return;

						//console.log(`New blob size: ${newBlob.size}`);

						const [filename, basename] =
							await this.generateFilePath(format);

						//console.log(`${filename}`);

						const arrayBuffer = await newBlob.arrayBuffer();
						const uint8Array = new Uint8Array(arrayBuffer);

						await this.app.vault.adapter.writeBinary(
							filename,
							uint8Array,
						);

						// Create Markdown link to JPEG
						const markdownLink = `![[${basename}]]`;

						// Get the current editor instance
						const activeLeaf = this.app.workspace.activeLeaf;
						const editor =
							activeLeaf?.view.getViewType() === "markdown"
								? (activeLeaf.view as MarkdownView).editor
								: null;

						// Insert Markdown link at cursor position
						if (editor) {
							editor.replaceSelection(markdownLink);
						} else {
							new Notice(
								"Image converted and saved but not pasted because no active editor",
							);
							new Notice(`Full path: ${filename}`, 10000);

							console.log(
								"No active text editor. Can't insert Markdown link.",
							);
						}
					},
					format,
					parseFloat(compression),
				);

				//console.log(`'compression is ',${this.settings.compression}'`);
				//console.log(`Type of compression from settings: ${typeof this.settings.compression}`);
			};
		};
		reader.readAsDataURL(blob);
	}

	getDims(img: HTMLImageElement, maxDim: number): [number, number] {
		const aspectRatio = img.width / img.height;
		let newWidth, newHeight;

		if (maxDim > 49) {
			if (img.width > maxDim || img.height > maxDim) {
				if (img.width > img.height) {
					newWidth = maxDim;
					newHeight = newWidth / aspectRatio;
				} else {
					newHeight = maxDim;
					newWidth = newHeight * aspectRatio;
				}
			} else {
				newWidth = img.width;
				newHeight = img.height;
			}
		} else {
			newWidth = img.width;
			newHeight = img.height;
		}

		return [newWidth, newHeight];
	}

	async generateFilePath(format: string): Promise<[string, string]> {
		// Get the current date-time and format it
		const now = new Date();
		const extension = format.split("/")[1];

		const formattedDateTime = `${now.getFullYear()}${String(
			now.getMonth() + 1,
		).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(
			now.getHours(),
		).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

		const rand = Math.floor(Math.random() * 1000);

		// Get the name of the currently active file
		const activeFile = this.app.workspace.getActiveFile();
		const currentFileDirectory = activeFile?.parent?.path ?? "";


		// Determine the folder path
		const folderPath = this.settings.imgPath
			? this.settings.imgPath
			: currentFileDirectory;

		// Determine the filename with prefix
		const originalName = activeFile ? activeFile.basename : "Image";

		// Generate a unique filename
		const filename = `${folderPath}/${this.settings.imgPrefix}${originalName}-${formattedDateTime}-${rand}.${extension}`;
		const parts = filename.split("/");
		const basename = parts.pop() || "";

		const directoryPath = path.dirname(filename);
		//console.log(`'want to create',${directoryPath}`);

		// Check if directory exists, if not create it
		const directoryExists =
			await this.app.vault.adapter.exists(directoryPath);
		if (!directoryExists) {
			await this.app.vault.createFolder(directoryPath);
		}

		return [filename, basename];
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: pasteToJpeg;

	constructor(app: App, plugin: pasteToJpeg) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("compression level")
			.setDesc("your choice")
			.addText((text) =>
				text
					.setPlaceholder(".6-.95")
					.setValue(this.plugin.settings.compression)
					.onChange(async (value) => {
						this.plugin.settings.compression = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("resize if bigger than")
			.setDesc(
				"resize the image if the bigger dimension is higher than this value. 0 doesn't resize",
			)
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.maxdim)
					.onChange(async (value) => {
						this.plugin.settings.maxdim = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("images prefix")
			.setDesc(
				"can contain a relative path. relative to images path if set, or to the active file.",
			)
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.imgPrefix)
					.onChange(async (value) => {
						this.plugin.settings.imgPrefix = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("images path")
			.setDesc("an absolute path")
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.imgPath)
					.onChange(async (value) => {
						this.plugin.settings.imgPath = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Image Format")
			.setDesc("Choose between JPEG and WebP formats.")
			.addDropdown((dropdown) => {
				for (const [value, text] of Object.entries(imageFormats)) {
					dropdown.addOption(value, text);
				}
				dropdown
					.setValue(this.plugin.settings.imgFormat)
					.onChange(async (value) => {
						this.plugin.settings.imgFormat = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName("Convert in Editor Only")
			.setDesc("Enable this to only convert images in the editor.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.convertInEditorOnly)
					.onChange(async (value) => {
						this.plugin.settings.convertInEditorOnly = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Ask user every time")
			.setDesc("Enable this to ask the parameters each time as a pop-up.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.askUser)
					.onChange(async (value) => {
						this.plugin.settings.askUser = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("Save parameters")
			.setDesc(
				"Enable this to save the values the user selects in the pop-up",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.saveaskUser)
					.onChange(async (value) => {
						this.plugin.settings.saveaskUser = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
