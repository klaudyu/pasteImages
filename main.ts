import { App, Plugin, PluginSettingTab, Setting,/*Modal*/ } from 'obsidian';
//import path from "path";
import path from 'path';
// Remember to rename these classes and interfaces!

interface pasteToJpegSettings {
    compression: string,
    maxdim: string,
    imgPrefix: string,
    imgPath: string
}

const DEFAULT_SETTINGS: pasteToJpegSettings = {
    compression: .95,
    maxdim:0,
    imgPrefix: '',
    imgPath:''
}

export default class pasteToJpeg extends Plugin {
    settings: pasteToJpegSettings;
 
    async onload() {
        await this.loadSettings();
        document.addEventListener("paste", this.handlePaste.bind(this), true);    
        
        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    onunload() {
        document.removeEventListener('paste', this.handlePaste.bind(this),true);
        
    }


   async handlePaste(e) {
    const clipboardData = e.clipboardData || window.clipboardData;
    const items = clipboardData.items || [];
    let pngFound = false;

    for (const index in items) {
      const item = items[index]; 
      if (item.kind === 'file' && item.type === 'image/png') { 

        pngFound = true;
        e.stopPropagation();
        e.preventDefault();

        const blob = item.getAsFile();
        const reader = new FileReader();
        console.log(`Original blob size: ${blob.size}`);  

        reader.onload = async (event) => {
          const img = new Image();
          img.src = event.target.result;
          
          img.onload = async () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              const aspectRatio = img.width / img.height;
              let newWidth, newHeight;

              if (this.settings.maxdim > 100) {
                // Check if either dimension is larger than maxdim
                if (img.width > this.settings.maxdim || img.height > this.settings.maxdim) {
                  if (img.width > img.height) {
                    newWidth = this.settings.maxdim;
                    newHeight = newWidth / aspectRatio;
                  } else {
                    newHeight = this.settings.maxdim;
                    newWidth = newHeight * aspectRatio;
                  }
                } else {
                  // If the image is already smaller than maxdim, don't resize
                  newWidth = img.width;
                  newHeight = img.height;
                }
              } else {
                newWidth = img.width;
                newHeight = img.height;
              }

              canvas.width = newWidth;
              canvas.height = newHeight;
              ctx.drawImage(img, 0, 0, newWidth, newHeight);

            canvas.toBlob(async (newBlob) => {
            console.log(`New blob size: ${newBlob.size}`);
            
            // Get the current date-time and format it
            const now = new Date();
            const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}-${String(now.getMilliseconds()).padStart(3, '0')}`;
            const rand = Math.floor(Math.random() * 1000); 


            // Get the name of the currently active file
            const activeFile = this.app.workspace.getActiveFile();
            const currentFileDirectory = activeFile ? activeFile.parent.path : '';

            // Determine the folder path
            const folderPath = this.settings.imgPath ? this.settings.imgPath : currentFileDirectory;

            // Determine the filename with prefix
            const originalName = activeFile ? activeFile.basename : 'Image';
              
              // Generate a unique filename
              const filename = `${folderPath}/${this.settings.imgPrefix}${originalName}-${formattedDateTime}-rnd${rand}.jpeg`;
                const parts = filename.split('/');
                const basename = parts.pop();
                

                const directoryPath = path.dirname(filename);
                console.log(`'want to create',${directoryPath}`);
                
                if (!await this.app.vault.exists(`${directoryPath}`)){
                    await this.app.vault.createFolder(`${directoryPath}`)
                }
                
                
              console.log(`${filename}`);
   
            
              const arrayBuffer = await newBlob.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              await this.app.vault.adapter.write(filename, uint8Array);

              // Create Markdown link to JPEG
                const markdownLink = `![[${basename}]]`; 
                

                // Get the current editor instance
                const editor = this.app.workspace.activeLeaf.view.editor;
                
                // Insert Markdown link at cursor position
                editor.replaceSelection(markdownLink);
            }, 'image/jpeg', parseFloat(this.settings.compression));
            
            console.log(`'compression is ',${this.settings.compression}'`);
            console.log(`Type of compression from settings: ${typeof this.settings.compression}`); 

          };
        };
        reader.readAsDataURL(blob);
      }
    }

    // If no PNG is found, let the event pass through for normal handling
    if (!pngFound) {
      return true;
    }
  }





    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

/*
class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}*/

class SampleSettingTab extends PluginSettingTab {
    plugin: pasteToJpeg;

    constructor(app: App, plugin: pasteToJpeg) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('compression level')
            .setDesc('your choice')
            .addText(text => text
                .setPlaceholder('.6-.95')
                .setValue(this.plugin.settings.compression)
                .onChange(async (value) => {
                    this.plugin.settings.compression = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('resize if bigger than')
            .setDesc('resize the image if the bigger dimension is higher than this value. 0 doesn\'t resize')
            .addText(text => text
                .setPlaceholder('100-10000')
                .setValue(this.plugin.settings.maxdim)
                .onChange(async (value) => {
                    this.plugin.settings.maxdim = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('images prefix')
            .setDesc('can contain a relative path. relative to images path if set, or to the active file.')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.imgPrefix)
                .onChange(async (value) => {
                    this.plugin.settings.imgPrefix = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('images path')
            .setDesc('an absolute path')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.imgPath)
                .onChange(async (value) => {
                    this.plugin.settings.imgPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}