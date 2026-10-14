import { z } from "zod"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { TextResult } from "@/utils/tools"
import { msgInvoker } from "@/utils/invoker"
import { InvokerFunc } from "@/types"

export function registerBrowserTools(server: McpServer) {
  server.tool("switch-tab", { id: z.number() }, async ({ id }) => {
    const tab = await chrome.tabs.update(id, {
      active: true,
      selected: true,
    })
    return TextResult(`Success: ${tab.title}`)
  })

  server.tool("get-tabs", async () => {
    const tabs = await chrome.tabs.query({})
    const text = tabs
      .map((t) => `ID: ${t.id}\nTitle: ${t.title}\nURL: ${t.url}`)
      .join("\n\n")
    return TextResult(text)
  })

  server.tool("new-tab", { url: z.string() }, async ({ url }) => {
    const tab = await chrome.tabs.create({
      url,
    })
    await tabReady()
    return msgInvoker.invoke({
      tabId: tab.id,
      func: InvokerFunc.CallTools,
      args: ["page_snapshot", {}],
    })
  })

  server.tool("remove-tab", { ids: z.array(z.number()) }, async ({ ids }) => {
    await chrome.tabs.remove(ids)
    return TextResult("Done")
  })

  server.tool("wait", { seconds: z.number() }, async ({ seconds }) => {
    await new Promise((r) => setTimeout(r, seconds * 1000))
    return TextResult("Done")
  })
}

export function registerPageTools(server: McpServer) {
  const elementSchema = {
    element: z
      .string()
      .describe(
        "Human-readable element description used to obtain permission to interact with the element"
      ),
    ref: z.string().describe("Exact target element id from the page snapshot"),
  }

  server.tool(
    "page_snapshot",
    "Capture accessibility snapshot of the current page",
    async () => {
      const tab = await tabReady()
      return msgInvoker.invoke({
        tabId: tab.id,
        func: InvokerFunc.CallTools,
        args: ["page_snapshot", {}],
      })
    }
  )
  server.tool(
    "click",
    "Perform click on a web page",
    elementSchema,
    async ({ element, ref }) => {
      const tab = await tabReady()
      return msgInvoker.invoke({
        tabId: tab.id,
        func: InvokerFunc.CallTools,
        args: ["click", { element, ref }],
      })
    }
  )
  server.tool("dbclick", elementSchema, async ({ element, ref }) => {
    const tab = await tabReady()
    return msgInvoker.invoke({
      tabId: tab.id,
      func: InvokerFunc.CallTools,
      args: ["dbclick", { element, ref }],
    })
  })

  const typeSchema = {
    ...elementSchema,
    text: z.string().describe("Text to type into the element"),
  }

  server.tool(
    "type",
    "Type text into editable element",
    typeSchema,
    async ({ element, ref, text }) => {
      const tab = await tabReady()
      return msgInvoker.invoke({
        tabId: tab.id,
        func: InvokerFunc.CallTools,
        args: ["type", { element, ref, text }],
      })
    }
  )

  const keySchema = {
    ...elementSchema,
    key: z.string().describe("Key to press"),
  }

  server.tool("press_key", keySchema, async ({ element, ref, key }) => {
    const tab = await tabReady()
    return msgInvoker.invoke({
      tabId: tab.id,
      func: InvokerFunc.CallTools,
      args: ["press_key", { element, ref, key }],
    })
  })

  server.tool(
    "get_file_inputs",
    "List file input elements available on the current page",
    async () => {
      const tab = await tabReady()
      return msgInvoker.invoke({
        tabId: tab.id,
        func: InvokerFunc.CallTools,
        args: ["get_file_inputs", {}],
      })
    }
  )

  const fileSchema = z.object({
    name: z.string().describe("File name including extension"),
    mime_type: z.string().optional().describe("MIME type such as image/png"),
    base64: z.string().describe("Base64 encoded file bytes, without a data URL prefix"),
  })

  server.tool(
    "upload_file",
    "Attach one file to a file input on the current page",
    {
      ...elementSchema,
      file: fileSchema,
    },
    async ({ element, ref, file }) => {
      const tab = await tabReady()
      return msgInvoker.invoke({
        tabId: tab.id,
        func: InvokerFunc.CallTools,
        args: ["upload_files", { element, ref, files: [file] }],
      })
    }
  )

  server.tool(
    "upload_files",
    "Attach one or more files to a file input on the current page",
    {
      ...elementSchema,
      files: z.array(fileSchema).min(1),
    },
    async ({ element, ref, files }) => {
      const tab = await tabReady()
      return msgInvoker.invoke({
        tabId: tab.id,
        func: InvokerFunc.CallTools,
        args: ["upload_files", { element, ref, files }],
      })
    }
  )

  server.tool(
    "upload_file_from_url",
    "Fetch a file from an accessible URL and attach it to a file input",
    {
      ...elementSchema,
      url: z.string().describe("Source URL, including http(s), data, blob, or file URL when browser permissions allow it"),
      name: z.string().optional().describe("Optional file name override"),
      mime_type: z.string().optional().describe("Optional MIME type override"),
    },
    async ({ element, ref, url, name, mime_type }) => {
      const tab = await tabReady()
      return msgInvoker.invoke({
        tabId: tab.id,
        func: InvokerFunc.CallTools,
        args: ["upload_file_from_url", { element, ref, url, name, mime_type }],
      })
    }
  )
}

async function tabReady() {
  const tabs = await chrome.tabs.query({ active: true })
  const tab = tabs[0]
  const url = tab?.pendingUrl || tab?.url
  if (!tab || !url?.startsWith("http")) {
    throw Error(
      "The current tab is unavailable, Please open or switch to the target tab first"
    )
  }
  if (tab.status == "complete") {
    return tab
  }
  await new Promise<chrome.tabs.Tab>((r) => {
    const handleUpdated = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId == tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(handleUpdated)
        r(tab)
      }
    }
    chrome.tabs.onUpdated.addListener(handleUpdated)
  })
  return tab
}

export function insiderTools(server: McpServer) {
  server.tool("google_search", { q: z.string() }, async ({ q }) => {
    await chrome.search.query({
      disposition: "NEW_TAB",
      text: q,
    })
    return TextResult("")
  })

  server.tool(
    "send-notification",
    {
      id: z.string(),
      title: z.string().optional(),
      message: z.string().optional(),
    },
    async ({ id, title, message }) => {
      await chrome.notifications.create(id, {
        iconUrl: "/logo.png",
        type: "basic",
        title,
        message,
      })
      return TextResult("")
    }
  )

  server.tool(
    "download",
    { url: z.string(), filename: z.string().optional() },
    async ({ filename, url }) => {
      await chrome.downloads.download({
        url,
        filename,
      })
      return TextResult("started download")
    }
  )
}
