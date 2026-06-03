export function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error

  const err = error as any

  const responseData = err?.response?.data
  if (typeof responseData === "string") return responseData
  if (Array.isArray(responseData?.message)) return responseData.message.join("\n")
  if (typeof responseData?.message === "string") return responseData.message
  if (typeof responseData?.error === "string") return responseData.error

  const directData = err?.data
  if (typeof directData === "string") return directData
  if (Array.isArray(directData?.message)) return directData.message.join("\n")
  if (typeof directData?.message === "string") return directData.message
  if (typeof directData?.error === "string") return directData.error

  if (typeof err?.message === "string" && err.message) return err.message

  return "An error occurred"
}