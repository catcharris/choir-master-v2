const { execSync } = require('child_process');
const fs = require('fs');
const title = "True T=0 Native Sync Architecture: A Zero-Latency Hardware Event-Lock Paradigm for Distributed Virtual Choirs";
const content = fs.readFileSync('docs/true_t0_sync_notebook_export.md', 'utf8');

const mcpCall = {
    method: "notebooklm/create_document",
    params: {
        title: title,
        content: content
    }
};

try {
    const result = execSync(`node /Volumes/Lemon\\ SSD/antigravity_scratch/openclaw/client/dist/cli.js '${JSON.stringify(mcpCall).replace(/'/g, "\\'")}'`, { encoding: 'utf8' });
    console.log(result);
} catch (error) {
    console.error("Error executing openclaw cli:", error.status, error.message);
    if(error.stdout) console.log("STDOUT:", error.stdout);
    if(error.stderr) console.error("STDERR:", error.stderr);
}
