# obsidian paste to jpeg
Inspired by https://github.com/musug/obsidian-paste-png-to-jpeg
The problem with that plugin was that if using syncronization via syncthing or dropbox, 
or any other sync mechanism, that plugin was converting the png files to jpeg.
I only needed this conversion to happen when I paste, and not when I drag&drop 
or syncronize.
The plugin mentioned before was just monitoring all the files, and if was detecting
a new png, was converting it to jpeg.

# Features
- Paste image and convert it to jpeg
- Posibility to set a default folder, and a default prefix, which can contain
a path. That way it creates a subfolder in the current folder
- posibility to set the quality of the jpg conversion
- posibility to set the a maximum image dimension, so if the image is bigger
than that it is resized.
- paste multiple images at once

# ToDo
- add option to ask the user if it wants to convert
 