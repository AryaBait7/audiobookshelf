// Shared serialized shapes (toJSON output). Derived from server/objects/Task.js and
// server/objects/files/LibraryFile.js. Class types themselves come from the migrated
// classes; only the JSON contract lives here so streams don't redefine it.

declare namespace AbsShared {
  interface TaskString {
    text: string
    key: string
    subs?: string[]
  }

  interface TaskJSON {
    id: string | null
    action: string | null
    data: Record<string, any>
    title: string | null
    titleKey: string | null
    titleSubs: string[] | null
    description: string | null
    descriptionKey: string | null
    descriptionSubs: string[] | null
    error: string | null
    errorKey: string | null
    errorSubs: string[] | null
    showSuccess: boolean
    isFailed: boolean
    isFinished: boolean
    startedAt: number | null
    finishedAt: number | null
  }

  type LibraryFileType = 'image' | 'audio' | 'ebook' | 'text' | 'metadata' | 'unknown'

  interface LibraryFileJSON {
    ino: string | null
    metadata: Record<string, any>
    isSupplementary: boolean | null
    addedAt: number | null
    updatedAt: number | null
    fileType: LibraryFileType
  }
}
