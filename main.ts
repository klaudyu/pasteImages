import { App, Modal, Plugin, PluginSettingTab, Setting } from "obsidian";

const imageFormats = {
	"image/jpeg": "JPEG",
	"image/webp": "WebP",
	// Add more as needed
};

//import path from "path";
import path from "path";

class CustomModal extends Modal {
	plugin: pasteToJpeg; // add this line

	constructor(app, plugin) {
		super(app);
		this.wasCancelled = false;
		this.plugin = plugin;
	}

	onOpen() {
		let { contentEl } = this;

		// Create divs to group related elements
		let resizeDiv = contentEl.createEl("div", { cls: "input-group" });
		let formatDiv = contentEl.createEl("div", { cls: "input-group" });
		let compressDiv = contentEl.createEl("div", { cls: "input-group" });
		let buttonDiv = contentEl.createEl("div", { cls: "button-group" });

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
			let option = this.formatSelect.createEl("option", { value, text });
			// Setting the default value based on plugin.settings.format
			if (this.plugin.settings.imgFormat === value) {
				option.selected = true;
			}
		}

		console.log(`"format select is"${this.formatSelect.value}`);

		// Create the buttons
		let confirmButton = buttonDiv.createEl("button", {
			text: "OK",
			type: "submit",
		});
		let cancelButton = buttonDiv.createEl("button", { text: "Cancel" });

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

async function getUserSettings(plugin) {
	console.log(`"the plugin in getUserSettings is ${plugin}`);
	return new Promise((resolve, reject) => {
		let myModal = new CustomModal(app, plugin);
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
    askUser:boolean;
}

const DEFAULT_SETTINGS: pasteToJpegSettings = {
	compression: 0.95,
	maxdim: 0,
	imgPrefix: "",
	imgFormat: "image/jpeg", // or 'image/webp'
	imgPath: "",
	convertInEditorOnly: true,
    askUser:false
};

export default class pasteToJpeg extends Plugin {
	settings: pasteToJpegSettings;
	boundHandlePaste: any;

	async onload() {
		await this.loadSettings();
		this.boundHandlePaste = this.handlePaste.bind(this);
		document.addEventListener("paste", this.boundHandlePaste, true);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		//document.removeEventListener('paste', this.handlePaste.bind(this),true);
		document.removeEventListener("paste", this.boundHandlePaste, true);
	}

	async handlePaste(e) {
		const clipboardData = e.clipboardData || window.clipboardData;
		const items = clipboardData.items || [];

		if (this.settings.convertInEditorOnly && !this.isInEditor()) {
			return;
		}

		for (const index in items) {
			const item = items[index];
			console.log(`${item.kind}, ${item.type}`);
			if (
				item.kind === "file" &&
				(item.type === "image/png" || item.type === "image/jpeg")
			) {
				e.stopPropagation();
				e.preventDefault();
				//const userSettings = await getUserSettings();
				//console.log(`${userSettings}`);

				this.saveitem2Format(item);
				//this.saveitem2Format(item,'image/jpeg');
			}
		}
	}

	saveitem2Format(item): void {
		const blob = item.getAsFile();
		const reader = new FileReader();

		//console.log(`Original blob size: ${blob.size}`);

		reader.onload = async (event) => {
			const img = new Image();
			img.src = event.target.result;

			img.onload = async () => {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
                let maxdim=this.settings.maxdim;
                let compression=this.settings.compression;
                let format=this.settings.imgFormat;

                if (this.settings.askUser){
                    try {
                        const userSettings = await getUserSettings(this);
                        console.log(`'user selected:'${userSettings}`);
                        /*format,maxdim,cancelled,compression*/
                        if (!userSettings.cancelled){
                            compression=userSettings.compression;
                            maxdim=userSettings.maxdim;
                            format=userSettings.format;
                            if(this.settings.saveaskUser){
                                this.settings.maxdim=maxdim;
                                this.settings.compression=compression;
                                this.settings.imgFormat=format;
                            }
                        }
                    } catch (error) {
                        console.error("Failed to get user settings:", error);
                    }
                }

				const [newWidth, newHeight] = this.getDims(
					img,
					maxdim,
				);

				canvas.width = newWidth;
				canvas.height = newHeight;
				ctx.drawImage(img, 0, 0, newWidth, newHeight);

				canvas.toBlob(
					async (newBlob) => {
						//console.log(`New blob size: ${newBlob.size}`);

						const [filename, basename] =
							await this.generateFilePath(format);

						//console.log(`${filename}`);

						const arrayBuffer = await newBlob.arrayBuffer();
						const uint8Array = new Uint8Array(arrayBuffer);

						await this.app.vault.adapter.write(
							filename,
							uint8Array,
						);

						// Create Markdown link to JPEG
						const markdownLink = `![[${basename}]]`;

						// Get the current editor instance
						const editor =
							this.app.workspace.activeLeaf.view.editor;

						// Insert Markdown link at cursor position
						if (editor) {
							editor.replaceSelection(markdownLink);
						} else {
							new Notice(
								"Image converted and saved but not pasted because no active editor",
							);
							new Notice(`'Full path ${filename}'`, 10000);

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

	getDims(img, maxDim) {
		const aspectRatio = img.width / img.height;
		let newWidth, newHeight;

		if (maxDim > 100) {
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

	async generateFilePath(format): Promise<string> {
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
		const currentFileDirectory = activeFile ? activeFile.parent.path : "";

		// Determine the folder path
		const folderPath = this.settings.imgPath
			? this.settings.imgPath
			: currentFileDirectory;

		// Determine the filename with prefix
		const originalName = activeFile ? activeFile.basename : "Image";

		// Generate a unique filename
		const filename = `${folderPath}/${this.settings.imgPrefix}${originalName}-${formattedDateTime}-${rand}.${extension}`;
		const parts = filename.split("/");
		const basename = parts.pop();

		const directoryPath = path.dirname(filename);
		//console.log(`'want to create',${directoryPath}`);

		if (!(await this.app.vault.exists(`${directoryPath}`))) {
			await this.app.vault.createFolder(`${directoryPath}`);
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
			.setDesc("Enable this to save the values the user selects in the pop-up")
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
