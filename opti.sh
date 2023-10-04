#!/bin/bash
cd png/160
mkdir optimized 
## store optimized images in optimized directory ##
## Keep file system permission and make a backup of original PNG (see options below)  ##
for i in *.png; do optipng -o5 -quiet -keep -preserve -dir optimized -log optipng.log "$i"; done
