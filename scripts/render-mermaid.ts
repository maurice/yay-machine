import { exec } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function renderMermaid(mermaidText: string, fileName: string) {
  const inputFile = `${fileName}.mmd`;
  await writeFile(inputFile, mermaidText);
  await execAsync(`mmdc -i ${inputFile} -o ${fileName}`);
}
