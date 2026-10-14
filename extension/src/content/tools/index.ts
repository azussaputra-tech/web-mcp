import { TextResult } from "@/utils/tools"
import {
  page_snapshot,
  click,
  dblclick,
  type,
  press_key,
  get_file_inputs,
  upload_files,
  upload_file_from_url,
} from "./operate"

export const tools = {
  page_snapshot,
  click,
  dblclick,
  type,
  press_key,
  get_file_inputs,
  upload_files,
  upload_file_from_url,
}

export async function handleToolCall(
  name: string,
  params: Record<string, any>
) {
  try {
    switch (name) {
      case "page_snapshot":
        return await tools.page_snapshot(params.ref)
      case "click":
        return await tools.click(params.ref)
      case "dbclick":
        return await tools.dblclick(params.ref)
      case "type":
        return await tools.type(params.ref, params.text)
      case "press_key":
        return await tools.press_key(params.ref, params.key)
      case "get_file_inputs":
        return await tools.get_file_inputs()
      case "upload_files":
        return await tools.upload_files(params.ref, params.files)
      case "upload_file_from_url":
        return await tools.upload_file_from_url(
          params.ref,
          params.url,
          params.name,
          params.mime_type
        )
    }
  } catch (err) {
    return TextResult(`Error: ${err?.message || err}`)
  }
}
