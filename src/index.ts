import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.join(__dirname, "..", "notes");

const server = new McpServer({
    name: "Note MCP Server",
    version: "0.1.0",
    description: "A simple MCP server for managing notes.",
})

server.registerTool(
    'create_note',
    {
        description: "สร้าง note ใหม่เป็นไฟล์ .md โดยระบุชื่อและเนื้อหา",
        inputSchema: {
            title: z.string().min(1).describe("ชื่อ note (จะใช้เป็นชื่อไฟล์)"),
            content: z.string().describe("เนื้อหาของ note"),
        },
    },
    async ({ title, content }) => {
        await fs.mkdir(NOTES_DIR, { recursive: true });

        const filename = title.toLowerCase().replace(/\s+/g, "-") + ".md";
        const filepath = path.join(NOTES_DIR, filename);
        const body = `# ${title}\n\n${content}`;

        await fs.writeFile(filepath, body, "utf-8");

        return {
            content: [
                {
                    type: "text",
                    text: `สร้าง note "${title}" เรียบร้อย → ${filename}`,
                },
            ],
        };
    }
)


server.registerTool(
    "list_notes",
    {
        description: "แสดงรายการ note ทั้งหมดที่มีอยู่",
        inputSchema: {},
    },
    async () => {
        await fs.mkdir(NOTES_DIR, { recursive: true });

        const files = await fs.readdir(NOTES_DIR);
        const mdFiles = files.filter((f) => f.endsWith(".md"));

        if (mdFiles.length === 0) {
            return {
                content: [{ type: "text", text: "ยังไม่มี note เลย" }],
            };
        }

        const list = mdFiles.map((f, i) => `${i + 1}. ${f}`).join("\n");
        return {
            content: [{ type: "text", text: `Note ทั้งหมด:\n${list}` }],
        };
    }
);

server.registerTool(
    "read_note",
    {
        description: "อ่านเนื้อหาของ note จากชื่อไฟล์",
        inputSchema: {
            filename: z.string().describe("ชื่อไฟล์ เช่น my-note.md"),
        },
    },
    async ({ filename }) => {
        const filepath = path.join(NOTES_DIR, filename);

        try {
            const content = await fs.readFile(filepath, "utf-8");
            return {
                content: [{ type: "text", text: content }],
            };
        } catch {
            return {
                content: [{ type: "text", text: `ไม่พบไฟล์ "${filename}"` }],
            };
        }
    }
);

server.registerTool(
    "search_notes",
    {
        description: "ค้นหา note ที่มีคำที่ระบุอยู่ในเนื้อหา",
        inputSchema: {
            keyword: z.string().min(1).describe("คำที่ต้องการค้นหา"),
        },
    },
    async ({ keyword }) => {
        await fs.mkdir(NOTES_DIR, { recursive: true });

        const files = await fs.readdir(NOTES_DIR);
        const mdFiles = files.filter((f) => f.endsWith(".md"));
        const matched: string[] = [];

        for (const file of mdFiles) {
            const content = await fs.readFile(
                path.join(NOTES_DIR, file),
                "utf-8"
            );
            if (content.toLowerCase().includes(keyword.toLowerCase())) {
                matched.push(file);
            }
        }

        if (matched.length === 0) {
            return {
                content: [{ type: "text", text: `ไม่พบ note ที่มีคำว่า "${keyword}"` }],
            };
        }

        const list = matched.map((f, i) => `${i + 1}. ${f}`).join("\n");
        return {
            content: [
                { type: "text", text: `พบ ${matched.length} note:\n${list}` },
            ],
        };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);