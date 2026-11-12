import {mkdir,writeFile} from 'node:fs/promises';
// Static output contains no store pages. Protected files are served by the function.
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await writeFile(new URL('../dist/deployment.txt',import.meta.url),'NOX CFW deployment\n');
