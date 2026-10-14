import { createSyn } from "@web-mcp/syn"
import { queryRef, snapshot } from "./snapshot"
import { TextResult } from "@/utils/tools"

let syn: ReturnType<typeof createSyn>
export function getSyn(): typeof syn {
  if (!syn) {
    syn = createSyn()
  }
  return syn
}

export async function page_snapshot(ref?: string) {
  const el = queryRef(ref) || document.body
  const html = await snapshot(el)
  return TextResult(html)
}

export async function click(ref: string) {
  const syn = getSyn()
  const el = queryRef(ref)
  syn.click(el)
  return TextResult("done")
}

export async function dblclick(ref: string) {
  const syn = getSyn()
  const el = queryRef(ref)
  syn.dblclick(el)
  return TextResult("done")
}

export async function type(ref: string, text: string) {
  const syn = getSyn()
  const el = queryRef(ref)
  const node = el as HTMLElement
  syn.type(node, text)
  return TextResult("done")
}

export async function press_key(ref: string, key: string) {
  const syn = getSyn()
  const el = queryRef(ref)
  syn.key(el, key)
  return TextResult("done")
}

type EncodedFile = {
  name: string
  mime_type?: string
  base64: string
}

function ensureFileInput(ref: string) {
  const el = queryRef(ref)
  if (!(el instanceof HTMLInputElement) || el.type !== "file") {
    throw Error("Target element is not an <input type=\"file\">")
  }
  return el
}

function decodeBase64(base64: string) {
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64
  const binary = atob(clean.replace(/\s/g, ""))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  if (!input.multiple && files.length > 1) {
    throw Error("Target file input does not allow multiple files")
  }

  const dt = new DataTransfer()
  files.forEach((file) => dt.items.add(file))
  input.files = dt.files
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
  input.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
}

export async function get_file_inputs() {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'))
  const details = inputs.map((input, index) => {
    if (!input.__a11y?.id) {
      input.__a11y = {
        ...(input.__a11y || {}),
        id: `file-input-${index + 1}`,
      }
    }
    const accept = input.accept || "any"
    const multiple = input.multiple ? "yes" : "no"
    return `ref=${input.__a11y.id} accept=${accept} multiple=${multiple}`
  })
  return TextResult(details.length ? details.join("\n") : "No file inputs found")
}

export async function upload_files(ref: string, files: EncodedFile[]) {
  const input = ensureFileInput(ref)
  const browserFiles = files.map(
    (file) => new File([decodeBase64(file.base64)], file.name, { type: file.mime_type || "application/octet-stream" })
  )
  setInputFiles(input, browserFiles)
  return TextResult(`attached ${browserFiles.length} file(s)`)
}

export async function upload_file_from_url(
  ref: string,
  url: string,
  name?: string,
  mime_type?: string
) {
  const input = ensureFileInput(ref)
  const response = await fetch(url)
  if (!response.ok) throw Error(`Unable to fetch file: HTTP ${response.status}`)
  const blob = await response.blob()
  const inferredName = name || decodeURIComponent(new URL(url, location.href).pathname.split("/").pop() || "upload")
  const file = new File([blob], inferredName, { type: mime_type || blob.type || "application/octet-stream" })
  setInputFiles(input, [file])
  return TextResult(`attached ${file.name}`)
}
