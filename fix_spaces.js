const fs = require('fs');
const path = '/Volumes/Lemon SSD/antigravity_scratch/choir-tuner/src/components/master/MasterScoreModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/import React, \{ useState, useEffect \} from 'react';\n```javascript\n/, "import React, { useState, useEffect } from 'react';\n");
content = content.replace(/```javascript\n/, ""); // Just in case
content = content.replace(/\$\{ currentIndex \+ 1 \}/g, "${currentIndex + 1}");
content = content.replace(/\$\{ scoreUrls\.length \}/g, "${scoreUrls.length}");
content = content.replace(/\$\{ errorMsg \} /g, "${errorMsg}");
content = content.replace(/items - center/g, "items-center");
content = content.replace(/justify - center/g, "justify-center");
content = content.replace(/gap - 2/g, "gap-2");
content = content.replace(/px - 4/g, "px-4");
content = content.replace(/py - 2/g, "py-2");
content = content.replace(/rounded - full/g, "rounded-full");
content = content.replace(/shadow - xl/g, "shadow-xl");
content = content.replace(/transition - all/g, "transition-all");
content = content.replace(/font - bold/g, "font-bold");
content = content.replace(/text - sm/g, "text-sm");
content = content.replace(/backdrop - blur - md/g, "backdrop-blur-md");
content = content.replace(/shrink - 0/g, "shrink-0");
content = content.replace(/whitespace - nowrap/g, "whitespace-nowrap");
content = content.replace(/\{ isEditingLyrics \? /g, "{isEditingLyrics ? ");

fs.writeFileSync(path, content, 'utf8');
console.log("Spaces fixed");
