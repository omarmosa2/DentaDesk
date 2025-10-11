// Web Worker for heavy PDF processing tasks
// This worker handles CPU-intensive PDF generation to prevent UI blocking

export interface PDFWorkerMessage {
  type: 'PROCESS_HTML' | 'PROCESS_CANVAS' | 'GENERATE_PDF'
  data: any
  id: string
}

export interface PDFWorkerResponse {
  type: 'PROCESSED_HTML' | 'PROCESSED_CANVAS' | 'GENERATED_PDF' | 'ERROR'
  data: any
  id: string
  error?: string
}

// Web Worker implementation for PDF processing
export class PDFProcessingWorker {
  private worker: Worker | null = null
  private callbacks: Map<string, (result: any) => void> = new Map()

  constructor() {
    this.initializeWorker()
  }

  private initializeWorker(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported in this environment')
      return
    }

    try {
      // Create inline worker to avoid separate file
      const workerCode = `
        // PDF Processing Worker
        class PDFWorkerProcessor {
          static async processHTML(data) {
            try {
              // Import html2canvas dynamically
              const html2canvas = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')

              // Create temporary element
              const tempDiv = document.createElement('div')
              tempDiv.innerHTML = data.htmlContent
              tempDiv.style.position = 'absolute'
              tempDiv.style.left = '-9999px'
              tempDiv.style.top = '-9999px'
              tempDiv.style.width = '800px'

              document.body.appendChild(tempDiv)

              // Process in chunks if content is large
              const canvas = await html2canvas.default(tempDiv, {
                scale: data.scale || 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 800,
                height: tempDiv.scrollHeight,
              })

              document.body.removeChild(tempDiv)

              return {
                canvasData: canvas.toDataURL('image/jpeg', 0.8),
                width: canvas.width,
                height: canvas.height
              }
            } catch (error) {
              throw new Error('Failed to process HTML: ' + error.message)
            }
          }

          static async generatePDF(data) {
            try {
              // Import jsPDF dynamically
              const jsPDF = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')

              const pdf = new jsPDF.default({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
              })

              const pdfWidth = pdf.internal.pageSize.getWidth()
              const pdfHeight = pdf.internal.pageSize.getHeight()
              const imgWidth = pdfWidth - 20
              const imgHeight = (data.height * imgWidth) / data.width

              let heightLeft = imgHeight
              let position = 10

              // Add first page
              pdf.addImage(data.canvasData, 'JPEG', 10, position, imgWidth, imgHeight)
              heightLeft -= (pdfHeight - 20)

              // Add additional pages
              while (heightLeft >= 0) {
                position = heightLeft - imgHeight + 10
                pdf.addPage()
                pdf.addImage(data.canvasData, 'JPEG', 10, position, imgWidth, imgHeight)
                heightLeft -= (pdfHeight - 20)
              }

              return {
                pdfData: pdf.output('blob'),
                filename: data.filename
              }
            } catch (error) {
              throw new Error('Failed to generate PDF: ' + error.message)
            }
          }
        }

        // Worker message handler
        self.onmessage = async function(e) {
          const { type, data, id } = e.data

          try {
            let result

            switch (type) {
              case 'PROCESS_HTML':
                result = await PDFWorkerProcessor.processHTML(data)
                break
              case 'GENERATE_PDF':
                result = await PDFWorkerProcessor.generatePDF(data)
                break
              default:
                throw new Error('Unknown worker message type: ' + type)
            }

            self.postMessage({
              type: type.replace('PROCESS_', 'PROCESSED_').replace('GENERATE_', 'GENERATED_'),
              data: result,
              id
            })
          } catch (error) {
            self.postMessage({
              type: 'ERROR',
              error: error.message,
              id
            })
          }
        }
      `

      // Create blob and worker
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      this.worker = new Worker(URL.createObjectURL(blob))

      // Handle worker messages
      this.worker.onmessage = (e) => {
        const { type, data, id, error } = e.data
        const callback = this.callbacks.get(id)

        if (callback) {
          if (type === 'ERROR') {
            callback({ error })
          } else {
            callback({ result: data })
          }
          this.callbacks.delete(id)
        }
      }

      this.worker.onerror = (error) => {
        console.error('PDF Worker error:', error)
      }

    } catch (error) {
      console.error('Failed to initialize PDF worker:', error)
    }
  }

  // Process HTML content in worker
  async processHTML(htmlContent: string, scale: number = 1.5): Promise<any> {
    if (!this.worker) {
      throw new Error('Web Worker not available')
    }

    const id = Math.random().toString(36).substr(2, 9)

    return new Promise((resolve, reject) => {
      this.callbacks.set(id, ({ result, error }) => {
        if (error) {
          reject(new Error(error))
        } else {
          resolve(result)
        }
      })

      this.worker!.postMessage({
        type: 'PROCESS_HTML',
        data: { htmlContent, scale },
        id
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        this.callbacks.delete(id)
        reject(new Error('PDF processing timeout'))
      }, 30000)
    })
  }

  // Generate PDF in worker
  async generatePDF(canvasData: string, width: number, height: number, filename: string): Promise<any> {
    if (!this.worker) {
      throw new Error('Web Worker not available')
    }

    const id = Math.random().toString(36).substr(2, 9)

    return new Promise((resolve, reject) => {
      this.callbacks.set(id, ({ result, error }) => {
        if (error) {
          reject(new Error(error))
        } else {
          resolve(result)
        }
      })

      this.worker!.postMessage({
        type: 'GENERATE_PDF',
        data: { canvasData, width, height, filename },
        id
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        this.callbacks.delete(id)
        reject(new Error('PDF generation timeout'))
      }, 30000)
    })
  }

  // Cleanup worker
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.callbacks.clear()
  }
}

// Singleton instance for reuse
let pdfWorker: PDFProcessingWorker | null = null

export function getPDFWorker(): PDFProcessingWorker {
  if (!pdfWorker) {
    pdfWorker = new PDFProcessingWorker()
  }
  return pdfWorker
}

export function destroyPDFWorker(): void {
  if (pdfWorker) {
    pdfWorker.destroy()
    pdfWorker = null
  }
}